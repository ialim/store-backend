import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FulfillmentStatus, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DomainEventsService } from '../modules/events/services/domain-events.service';
import { WorkflowService } from './workflow.service';
import {
  SaleContext,
  toSaleContextPayload,
  SaleWorkflowState,
  saleStatusToState,
} from './sale.machine';

@Injectable()
export class PhaseCoordinator {
  private readonly logger = new Logger(PhaseCoordinator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
    private readonly workflow: WorkflowService,
  ) {}

  /**
   * Emit enrichment when a quotation transitions into the SALE phase.
   */
  async onQuotationApproved(quotationId: string): Promise<void> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
        SaleOrder: {
          select: {
            id: true,
            workflowState: true,
            workflowContext: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    if (!quotation.saleOrderId || !quotation.SaleOrder) {
      this.logger.warn(
        `Quotation ${quotationId} approved without an attached sale order`,
      );
      return;
    }
    const rawState = quotation.SaleOrder
      .workflowState as SaleWorkflowState | null;
    const previousState: SaleWorkflowState | null =
      rawState && rawState !== 'QUOTATION_DRAFT'
        ? rawState
        : rawState === 'QUOTATION_DRAFT'
          ? null
          : saleStatusToState(quotation.SaleOrder.status as SaleStatus);
    const existingContext =
      quotation.SaleOrder.workflowContext &&
      typeof quotation.SaleOrder.workflowContext === 'object'
        ? (quotation.SaleOrder.workflowContext as unknown as SaleContext)
        : null;
    const contextPayload = toSaleContextPayload({
      orderId: quotation.saleOrderId,
      grandTotal: quotation.totalAmount,
      capturedTotal: existingContext?.capturedTotal ?? 0,
      credit: {
        limit: existingContext?.credit?.limit ?? quotation.totalAmount,
        exposure: existingContext?.credit?.exposure ?? 0,
        overage: existingContext?.credit?.overage ?? quotation.totalAmount,
      },
      overrides: existingContext?.overrides ?? {},
      clearToFulfil: false,
    } as SaleContext) as Prisma.InputJsonValue;

    await this.workflow.recordSaleTransition({
      orderId: quotation.saleOrderId,
      fromState: previousState,
      toState: 'AWAITING_PAYMENT_METHOD',
      event: 'order.quotation.approved',
      context: contextPayload,
    });

    await this.domainEvents.publish(
      'order.quotation.approved',
      {
        quotationId,
        saleOrderId: quotation.saleOrderId,
        totalAmount: quotation.totalAmount,
      },
      {
        aggregateType: 'SaleOrder',
        aggregateId: quotation.saleOrderId,
      },
    );
  }

  /**
   * Emit enrichment once a sale has been cleared for fulfilment.
   */
  async onSaleCleared(orderId: string): Promise<void> {
    const order = await this.prisma.saleOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        storeId: true,
        workflowState: true,
        workflowContext: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Sale order not found');
    }

    await this.workflow.recordSaleTransition({
      orderId,
      fromState: order.workflowState ?? null,
      toState: 'CLEARED_FOR_FULFILMENT',
      event: 'order.sale.cleared',
      context:
        order.workflowContext && typeof order.workflowContext === 'object'
          ? (toSaleContextPayload(
              order.workflowContext as unknown as SaleContext,
            ) as Prisma.InputJsonValue)
          : null,
    });

    await this.domainEvents.publish(
      'order.sale.cleared',
      {
        orderId,
        totalAmount: order.totalAmount,
        storeId: order.storeId,
      },
      {
        aggregateType: 'SaleOrder',
        aggregateId: orderId,
      },
    );
  }

  /**
   * Broadcast fulfilment status changes so downstream read models stay in sync.
   */
  async onFulfilmentStatusChanged(
    orderId: string,
    status: FulfillmentStatus,
  ): Promise<void> {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: orderId },
      select: { id: true, type: true, deliveryPersonnelId: true },
    });
    if (!fulfillment) {
      this.logger.warn(
        `Fulfillment for order ${orderId} not found while emitting status ${status}`,
      );
    }

    await this.domainEvents.publish(
      'order.fulfillment.status_changed',
      {
        orderId,
        fulfillmentId: fulfillment?.id ?? null,
        status,
        type: fulfillment?.type ?? null,
        deliveryPersonnelId: fulfillment?.deliveryPersonnelId ?? null,
      },
      {
        aggregateType: 'SaleOrder',
        aggregateId: orderId,
      },
    );
  }
}
