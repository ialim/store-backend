import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Prisma,
  SaleStatus,
  SaleType,
  PaymentStatus,
  OrderPhase,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowService } from '../../state/workflow.service';
import { NotificationService } from '../notification/notification.service';

const EXPIRY_CRON = process.env.SALE_EXPIRY_CRON ?? CronExpression.EVERY_HOUR;
const FALLBACK_EXPIRY_MINUTES = 1440;
const FALLBACK_BATCH_SIZE = 50;

function resolveExpiryMinutes(): number {
  const raw = process.env.SALE_PENDING_EXPIRY_MINUTES;
  const parsed = raw != null ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : FALLBACK_EXPIRY_MINUTES;
}

function resolveBatchSize(): number {
  const raw = process.env.SALE_EXPIRY_BATCH_SIZE;
  const parsed = raw != null ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_BATCH_SIZE;
}

@Injectable()
export class SaleExpiryService {
  private readonly logger = new Logger(SaleExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(EXPIRY_CRON)
  async handleCron() {
    try {
      const expired = await this.expireStaleSales();
      if (expired > 0) {
        this.logger.log(`Expired ${expired} stale sale(s).`);
      }
    } catch (error) {
      this.logger.error('Failed to expire stale sales', error as Error);
    }
  }

  async expireStaleSales(limit?: number): Promise<number> {
    const expiryMinutes = resolveExpiryMinutes();
    const batchSize = limit && limit > 0 ? limit : resolveBatchSize();

    if (!Number.isFinite(expiryMinutes) || expiryMinutes <= 0) {
      this.logger.debug('Sale expiry disabled: invalid expiry window.');
      return 0;
    }

    const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);

    const staleOrders = await this.prisma.saleOrder.findMany({
      where: {
        status: SaleStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      include: {
        consumerSale: { include: { items: true } },
        resellerSale: { include: { items: true } },
        ConsumerPayment: { where: { status: PaymentStatus.CONFIRMED } },
        ResellerPayment: { where: { status: PaymentStatus.CONFIRMED } },
        biller: true,
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let processed = 0;

    for (const order of staleOrders) {
      const hasConfirmedPayments =
        (order.ConsumerPayment?.length ?? 0) > 0 ||
        (order.ResellerPayment?.length ?? 0) > 0;
      if (hasConfirmedPayments) {
        continue;
      }

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const fresh = await tx.saleOrder.findUnique({
            where: { id: order.id },
            include: {
              consumerSale: { include: { items: true } },
              resellerSale: { include: { items: true } },
              ConsumerPayment: { where: { status: PaymentStatus.CONFIRMED } },
              ResellerPayment: { where: { status: PaymentStatus.CONFIRMED } },
            },
          });

          if (!fresh || fresh.status !== SaleStatus.PENDING) {
            return null;
          }

          if (
            (fresh.ConsumerPayment?.length ?? 0) > 0 ||
            (fresh.ResellerPayment?.length ?? 0) > 0
          ) {
            return null;
          }

          const consumerSale = fresh.consumerSale ?? null;
          const resellerSale = fresh.resellerSale ?? null;

          if (consumerSale) {
            if (consumerSale.status !== SaleStatus.CANCELLED) {
              await tx.consumerSale.update({
                where: { id: consumerSale.id },
                data: { status: SaleStatus.CANCELLED },
              });
            }
            for (const item of consumerSale.items) {
              const stock = await tx.stock.findFirst({
                where: {
                  storeId: consumerSale.storeId,
                  productVariantId: item.productVariantId,
                },
                select: { id: true, reserved: true },
              });
              if (stock) {
                const nextReserved = Math.max(
                  (stock.reserved ?? 0) - item.quantity,
                  0,
                );
                await tx.stock.update({
                  where: { id: stock.id },
                  data: { reserved: nextReserved },
                });
              }
            }
          }

          if (resellerSale) {
            if (resellerSale.status !== SaleStatus.CANCELLED) {
              await tx.resellerSale.update({
                where: { id: resellerSale.id },
                data: { status: SaleStatus.CANCELLED },
              });
            }
            for (const item of resellerSale.items) {
              const stock = await tx.stock.findFirst({
                where: {
                  storeId: resellerSale.storeId,
                  productVariantId: item.productVariantId,
                },
                select: { id: true, reserved: true },
              });
              if (stock) {
                const nextReserved = Math.max(
                  (stock.reserved ?? 0) - item.quantity,
                  0,
                );
                await tx.stock.update({
                  where: { id: stock.id },
                  data: { reserved: nextReserved },
                });
              }
            }
          }

          await tx.saleOrder.update({
            where: { id: fresh.id },
            data: {
              status: SaleStatus.CANCELLED,
              phase: OrderPhase.SALE,
            },
          });

          await this.workflow.recordSaleTransition({
            orderId: fresh.id,
            fromState: fresh.workflowState,
            toState: 'SALE_EXPIRED',
            event: 'sale.expired',
            context: fresh.workflowContext ?? null,
            metadata: {
              reason: 'STALE_TIMEOUT',
              cutoff: cutoff.toISOString(),
            },
            tx,
          });

          return {
            billerId: fresh.billerId,
            consumerId: consumerSale?.customerId ?? null,
            resellerId: resellerSale?.resellerId ?? null,
            saleType: fresh.type,
          };
        });

        if (result) {
          processed += 1;
          const message = `Sale order ${order.id} expired after remaining pending for ${expiryMinutes} minutes.`;
          await this.notifications.createNotification(
            result.billerId,
            'SALE_EXPIRED',
            message,
          );
          if (result.saleType === SaleType.RESELLER && result.resellerId) {
            await this.notifications.createNotification(
              result.resellerId,
              'SALE_EXPIRED',
              message,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to expire sale order ${order.id}: ${(error as Error).message}`,
        );
      }
    }

    return processed;
  }
}
