import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DomainEventsService } from '../services/domain-events.service';
import {
  PaymentStatus as PrismaPaymentStatus,
  OrderPhase as PrismaOrderPhase,
  SaleType as PrismaSaleType,
  SaleStatus as PrismaSaleStatus,
  FulfillmentType as PrismaFulfillmentType,
  FulfillmentStatus as PrismaFulfillmentStatus,
} from '@prisma/client';

type PaymentConfirmedPayload = {
  saleOrderId?: string | null;
  [key: string]: unknown;
};

const parsePaymentPayload = (
  payload: Prisma.JsonValue | null | undefined,
): PaymentConfirmedPayload => {
  if (!payload || typeof payload !== 'object') return {};
  return payload as PaymentConfirmedPayload;
};

@Injectable()
export class PaymentsOutboxHandler {
  private readonly logger = new Logger(PaymentsOutboxHandler.name);
  constructor(
    private prisma: PrismaService,
    private domainEvents: DomainEventsService,
  ) {}

  async tryHandle(event: {
    id: string;
    type: string;
    payload: Prisma.JsonValue | null | undefined;
  }): Promise<boolean> {
    if (event.type !== 'PAYMENT_CONFIRMED') return false;
    const payload = parsePaymentPayload(event.payload);
    const orderId =
      typeof payload.saleOrderId === 'string' ? payload.saleOrderId : undefined;
    if (!orderId) return true; // malformed but considered handled
    try {
      const order = await this.prisma.saleOrder.findUnique({
        where: { id: orderId },
      });
      if (!order) return true;
      if (order.phase !== PrismaOrderPhase.SALE) return true; // Only advance from SALE phase

      // Sum confirmed payments
      const [consumerPaidAgg, resellerPaidAgg] = await Promise.all([
        this.prisma.consumerPayment.aggregate({
          _sum: { amount: true },
          where: {
            saleOrderId: orderId,
            status: PrismaPaymentStatus.CONFIRMED,
          },
        }),
        this.prisma.resellerPayment.aggregate({
          _sum: { amount: true },
          where: {
            saleOrderId: orderId,
            status: PrismaPaymentStatus.CONFIRMED,
          },
        }),
      ]);
      const paid =
        (consumerPaidAgg._sum.amount || 0) + (resellerPaidAgg._sum.amount || 0);

      let canAdvance = paid >= (order.totalAmount || 0);

      if (!canAdvance && order.type === PrismaSaleType.RESELLER) {
        const rSale = await this.prisma.resellerSale.findFirst({
          where: { SaleOrderid: orderId },
        });
        if (rSale) {
          const profile = await this.prisma.resellerProfile.findUnique({
            where: { userId: rSale.resellerId },
          });
          if (profile) {
            const unpaidPortion = Math.max((order.totalAmount || 0) - paid, 0);
            const projected = (profile.outstandingBalance || 0) + unpaidPortion;
            if (projected <= (profile.creditLimit || 0)) {
              canAdvance = true;
              await this.prisma.resellerProfile.update({
                where: { userId: rSale.resellerId },
                data: { outstandingBalance: projected },
              });
            }
          }
        }
      }

      if (!canAdvance) return true;

      // Mark paid if fully paid
      if (paid >= (order.totalAmount || 0)) {
        await this.prisma.saleOrder.update({
          where: { id: orderId },
          data: { status: PrismaSaleStatus.PAID },
        });
      }
      // Move to fulfillment and create record if missing
      await this.prisma.saleOrder.update({
        where: { id: orderId },
        data: { phase: PrismaOrderPhase.FULFILLMENT },
      });
      const existing = await this.prisma.fulfillment.findUnique({
        where: { saleOrderId: orderId },
      });
      if (!existing) {
        await this.prisma.fulfillment.create({
          data: {
            saleOrderId: orderId,
            type: PrismaFulfillmentType.PICKUP,
            status: PrismaFulfillmentStatus.PENDING,
          },
        });
      }

      // Reserve stock for this order now that it advances to fulfillment
      const cSale = await this.prisma.consumerSale.findFirst({
        where: { saleOrderId: orderId },
        include: { items: true },
      });
      if (cSale) {
        for (const it of cSale.items) {
          await this.prisma.stock.upsert({
            where: {
              storeId_productVariantId: {
                storeId: cSale.storeId,
                productVariantId: it.productVariantId,
              },
            },
            update: { reserved: { increment: it.quantity } },
            create: {
              storeId: cSale.storeId,
              productVariantId: it.productVariantId,
              quantity: 0,
              reserved: it.quantity,
            },
          });
        }
      } else {
        const rSale = await this.prisma.resellerSale.findFirst({
          where: { SaleOrderid: orderId },
          include: { items: true },
        });
        if (rSale) {
          for (const it of rSale.items) {
            await this.prisma.stock.upsert({
              where: {
                storeId_productVariantId: {
                  storeId: rSale.storeId,
                  productVariantId: it.productVariantId,
                },
              },
              update: { reserved: { increment: it.quantity } },
              create: {
                storeId: rSale.storeId,
                productVariantId: it.productVariantId,
                quantity: 0,
                reserved: it.quantity,
              },
            });
          }
        }
      }

      // Notify store manager and biller
      const so = await this.prisma.saleOrder.findUnique({
        where: { id: orderId },
      });
      if (so) {
        const store = await this.prisma.store.findUnique({
          where: { id: so.storeId },
        });
        if (store) {
          await this.domainEvents.publish(
            'NOTIFICATION',
            {
              notifications: [
                {
                  userId: store.managerId,
                  type: 'FULFILLMENT_REQUESTED',
                  message: `Order ${orderId} ready for fulfillment at store ${store.name}.`,
                },
              ],
            },
            { aggregateType: 'Notification' },
          );
        }
        await this.domainEvents.publish(
          'NOTIFICATION',
          {
            notifications: [
              {
                userId: so.billerId,
                type: 'ORDER_ADVANCED_TO_FULFILLMENT',
                message: `Order ${orderId} advanced to fulfillment phase.`,
              },
            ],
          },
          { aggregateType: 'Notification' },
        );
      }
      return true;
    } catch (e) {
      this.logger.error(
        `Failed to handle payment confirmed for order ${orderId}: ${e}`,
      );
      return false;
    }
  }
}
