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
import { PhaseCoordinator } from '../../../state/phase-coordinator';
import {
  runSaleMachine,
  saleStatusToState,
  toSaleContextPayload,
  SaleWorkflowState,
  SaleContext,
} from '../../../state/sale.machine';
import { toFulfilmentContextPayload } from '../../../state/fulfilment.machine';
import { WorkflowService } from '../../../state/workflow.service';

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
    private coordinator: PhaseCoordinator,
    private workflow: WorkflowService,
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
        select: {
          id: true,
          status: true,
          phase: true,
          type: true,
          totalAmount: true,
          workflowState: true,
          workflowContext: true,
          storeId: true,
        },
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
      const previousContext =
        order.workflowContext && typeof order.workflowContext === 'object'
          ? (order.workflowContext as unknown as SaleContext)
          : null;
      const previousState =
        (order.workflowState as SaleWorkflowState | null) ??
        saleStatusToState(order.status as PrismaSaleStatus);
      let creditLimit =
        previousContext?.credit?.limit ?? order.totalAmount ?? 0;
      let creditExposure = previousContext?.credit?.exposure ?? 0;

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
              creditLimit = profile.creditLimit ?? creditLimit;
              creditExposure = projected;
              await this.prisma.resellerProfile.update({
                where: { userId: rSale.resellerId },
                data: { outstandingBalance: projected },
              });
            } else {
              creditLimit = profile.creditLimit ?? creditLimit;
              creditExposure = profile.outstandingBalance ?? creditExposure;
            }
          }
        }
      }

      const saleMachineResult = runSaleMachine({
        status: order.status as PrismaSaleStatus,
        workflowState: previousState,
        workflowContext: previousContext ?? undefined,
        event: { type: 'PAYMENT_CONFIRMED', amount: paid },
        contextOverrides: {
          orderId,
          grandTotal: order.totalAmount ?? 0,
          capturedTotal: paid,
          credit: {
            limit: creditLimit,
            exposure: creditExposure,
            overage: Math.max((order.totalAmount || 0) - paid, 0),
          },
          overrides: previousContext?.overrides ?? {},
          clearToFulfil: canAdvance,
        },
      });

      if (
        !saleMachineResult.context.clearToFulfil ||
        saleMachineResult.state !== 'CLEARED_FOR_FULFILMENT'
      ) {
        return true;
      }

      if (
        saleMachineResult.changed ||
        previousContext?.clearToFulfil !==
          saleMachineResult.context.clearToFulfil ||
        previousContext?.credit?.overage !==
          saleMachineResult.context.credit.overage
      ) {
        await this.workflow.recordSaleTransition({
          orderId,
          fromState: previousState,
          toState: saleMachineResult.state,
          event: 'PAYMENT_CONFIRMED',
          context: toSaleContextPayload(
            saleMachineResult.context,
          ) as Prisma.InputJsonValue,
        });
      }

      if (
        paid >= (order.totalAmount || 0) &&
        order.status !== PrismaSaleStatus.PAID &&
        order.status !== PrismaSaleStatus.FULFILLED
      ) {
        await this.prisma.saleOrder.update({
          where: { id: orderId },
          data: { status: PrismaSaleStatus.PAID },
        });
        order.status = PrismaSaleStatus.PAID;
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
        const fulfillment = await this.prisma.fulfillment.create({
          data: {
            saleOrderId: orderId,
            type: PrismaFulfillmentType.PICKUP,
            status: PrismaFulfillmentStatus.PENDING,
            workflowState: 'ALLOCATING_STOCK',
          },
        });
        await this.workflow.recordFulfilmentTransition({
          fulfillmentId: fulfillment.id,
          fromState: null,
          toState: 'ALLOCATING_STOCK',
          event: 'fulfilment.created',
          context: toFulfilmentContextPayload({
            saleOrderId: orderId,
          }) as Prisma.InputJsonValue,
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

      await this.coordinator.onSaleCleared(orderId);

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
