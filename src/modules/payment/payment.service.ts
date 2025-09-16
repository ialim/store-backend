import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { DomainEventsService } from '../events/services/domain-events.service';
import { CreateConsumerPaymentInput } from '../sale/dto/create-consumer-payment.input';
import { ConfirmConsumerPaymentInput } from '../sale/dto/confirm-consumer-payment.input';
import { CreateResellerPaymentInput } from '../sale/dto/create-reseller-payment.input';
import { CreateSupplierPaymentInput } from '../purchase/dto/create-supplier-payment.input';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

  // Consumer payments
  async registerConsumerPayment(data: CreateConsumerPaymentInput) {
    const payment = await this.prisma.consumerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        consumerSaleId: data.consumerSaleId,
        amount: data.amount,
        method: data.method as Prisma.PaymentMethod,
        status: Prisma.PaymentStatus.PENDING,
        reference: data.reference || undefined,
      },
    });
    await this.notifications.createNotification(
      payment.saleOrderId,
      'CONSUMER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    const payment = await this.prisma.consumerPayment.update({
      where: { id: input.paymentId },
      data: { status: Prisma.PaymentStatus.CONFIRMED },
    });
    await this.domainEvents.publish(
      'PAYMENT_CONFIRMED',
      {
        paymentId: payment.id,
        saleOrderId: payment.saleOrderId,
        channel: 'CONSUMER',
      },
      { aggregateType: 'Payment', aggregateId: payment.id },
    );
    return payment;
  }

  // Reseller payments
  async registerResellerPayment(data: CreateResellerPaymentInput) {
    const payment = await this.prisma.resellerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        resellerId: data.resellerId,
        resellerSaleId: data.resellerSaleId,
        amount: data.amount,
        method: data.method as Prisma.PaymentMethod,
        status: Prisma.PaymentStatus.PENDING,
        reference: data.reference || undefined,
        receivedById: data.receivedById,
      },
    });
    await this.notifications.createNotification(
      data.receivedById,
      'RESELLER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmResellerPayment(paymentId: string) {
    const payment = await this.prisma.resellerPayment.update({
      where: { id: paymentId },
      data: { status: Prisma.PaymentStatus.CONFIRMED },
    });
    await this.domainEvents.publish(
      'PAYMENT_CONFIRMED',
      {
        paymentId: payment.id,
        saleOrderId: payment.saleOrderId,
        channel: 'RESELLER',
      },
      { aggregateType: 'Payment', aggregateId: payment.id },
    );
    return payment;
  }

  // Supplier payments
  async createSupplierPayment(data: CreateSupplierPaymentInput) {
    const payment = await this.prisma.supplierPayment.create({ data });
    // Reduce supplier current balance
    await this.prisma.supplier.update({
      where: { id: payment.supplierId },
      data: { currentBalance: { decrement: payment.amount } },
    });
    // If applied to a PO, update its payment status
    if (payment.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: payment.purchaseOrderId },
      });
      if (po) {
        const paidAgg = await this.prisma.supplierPayment.aggregate({
          _sum: { amount: true },
          where: { purchaseOrderId: po.id },
        });
        const paid = paidAgg._sum.amount || 0;
        const newStatus: Prisma.PurchaseOrderStatus =
          paid >= po.totalAmount
            ? Prisma.PurchaseOrderStatus.PAID
            : Prisma.PurchaseOrderStatus.PARTIALLY_PAID;
        await this.prisma.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: newStatus,
            phase:
              newStatus === Prisma.PurchaseOrderStatus.PAID
                ? Prisma.PurchasePhase.INVOICING
                : (po.phase as Prisma.PurchasePhase),
          },
        });
        await this.domainEvents.publish(
          'PURCHASE_ORDER_STATUS_UPDATED',
          { purchaseOrderId: po.id, status: newStatus },
          { aggregateType: 'PurchaseOrder', aggregateId: po.id },
        );
        // Maybe finalize
        const fresh = await this.prisma.purchaseOrder.findUnique({
          where: { id: po.id },
        });
        if (fresh) {
          const paidAgg2 = await this.prisma.supplierPayment.aggregate({
            _sum: { amount: true },
            where: { purchaseOrderId: fresh.id },
          });
          const paid2 = paidAgg2._sum.amount || 0;
          const isPaid = paid2 >= fresh.totalAmount;
          const isReceived =
            fresh.status === Prisma.PurchaseOrderStatus.RECEIVED;
          if (isPaid && isReceived) {
            await this.prisma.purchaseOrder.update({
              where: { id: fresh.id },
              data: { phase: Prisma.PurchasePhase.COMPLETED },
            });
            await this.domainEvents.publish(
              'PURCHASE_COMPLETED',
              { purchaseOrderId: fresh.id },
              { aggregateType: 'PurchaseOrder', aggregateId: fresh.id },
            );
            try {
              const supplier = await this.prisma.supplier.findUnique({ where: { id: fresh.supplierId }, select: { userId: true } });
              if (supplier?.userId) {
                await this.notifications.createNotification(
                  supplier.userId,
                  'PURCHASE_COMPLETED',
                  `PO ${fresh.invoiceNumber} completed.`,
                );
              }
            } catch {}
          }
        }
      }
    }
    try {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: payment.supplierId }, select: { userId: true } });
      if (supplier?.userId) {
        await this.notifications.createNotification(
          supplier.userId,
          'SUPPLIER_PAYMENT',
          `Payment of ${payment.amount} recorded for your account`,
        );
      }
    } catch {}
    return payment;
  }

  // Refund/credit helpers
  async recordConsumerRefund(params: {
    saleOrderId: string;
    consumerSaleId: string;
    amount: number;
    reference?: string;
  }) {
    return this.prisma.consumerPayment.create({
      data: {
        saleOrderId: params.saleOrderId,
        consumerSaleId: params.consumerSaleId,
        amount: -Math.abs(params.amount),
        method: Prisma.PaymentMethod.TRANSFER,
        status: Prisma.PaymentStatus.CONFIRMED,
        reference: params.reference || undefined,
      },
    });
  }

  async recordSupplierCreditNote(params: {
    supplierId: string;
    purchaseReturnId: string;
    amount: number;
    receivedById: string;
  }) {
    return this.prisma.payment.create({
      data: {
        type: Prisma.PaymentType.SUPPLIER,
        sourceId: params.supplierId,
        referenceEntity: 'PurchaseReturn',
        referenceId: params.purchaseReturnId,
        amount: params.amount,
        method: Prisma.PaymentMethod.BANK,
        receivedById: params.receivedById,
      },
    });
  }
}
