import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateConsumerSaleInput } from './dto/create-consumer-sale.input';
import { CreateResellerSaleInput } from './dto/create-reseller-sale.input';
import { SaleStatus } from '../../shared/prismagraphql/prisma/sale-status.enum';
import { UpdateQuotationStatusInput } from './dto/update-quotation-status.input';
import { CreateQuotationInput } from './dto/create-quotation.input';
import { QuotationCreateInput } from '../../shared/prismagraphql/quotation';
import { SaleType } from 'src/shared/prismagraphql/prisma/sale-type.enum';
import { CreateConsumerPaymentInput } from './dto/create-consumer-payment.input';
import { PaymentStatus } from '../../shared/prismagraphql/prisma/payment-status.enum';
import { ConfirmConsumerPaymentInput } from './dto/confirm-consumer-payment.input';
import { CreateConsumerReceiptInput } from './dto/create-consumer-receipt.input';
import { MovementDirection } from 'src/shared/prismagraphql/prisma/movement-direction.enum';
import { MovementType } from 'src/shared/prismagraphql/prisma/movement-type.enum';
import { CreateFulfillmentInput } from './dto/create-fulfillment.input';
import { CreateResellerPaymentInput } from './dto/create-reseller-payment.input';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Quotation flows
  async quotations() {
    return this.prisma.quotation.findMany({
      include: { items: true, reseller: true, biller: true },
    });
  }

  async quotation(id: string) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async createQuotation(data: QuotationCreateInput) {
    const q = await this.prisma.quotation.create({
      data,
      include: { items: true },
    });
    await this.notificationService.createNotification(
      q.billerId,
      'QUOTATION',
      `New quotation from ${q.resellerId}`,
    );
    return q;
  }

  async updateQuotationStatus(input: UpdateQuotationStatusInput) {
    const q = await this.prisma.quotation.update({
      where: { id: input.id },
      data: { status: input.status },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      q.resellerId,
      'QUOTATION_UPDATED',
      `Quotation ${q.id} ${q.status}`,
    );
    return q;
  }

  // Consumer Sales
  async consumerSales() {
    return this.prisma.consumerSale.findMany({ include: { items: true } });
  }

  async consumerSale(id: string) {
    const sale = await this.prisma.consumerSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Consumer sale not found');
    return sale;
  }

  async createConsumerSale(data: CreateConsumerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.CONSUMER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
    });
    const sale = await this.prisma.consumerSale.create({
      data: {
        saleOrderId: order.id,
        customerId: data.customerId,
        storeId: data.storeId,
        billerId: data.billerId,
        channel: data.channel,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'CONSUMER_SALE_CREATED',
      `Sale ${sale.id} is pending payment.`,
    );
    return sale;
  }

  async registerConsumerPayment(data: CreateConsumerPaymentInput) {
    const payment = await this.prisma.consumerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        consumerSaleId: data.consumerSaleId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
        reference: data.reference || undefined,
      },
    });
    await this.notificationService.createNotification(
      payment.saleOrderId,
      'CONSUMER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    const payment = await this.prisma.consumerPayment.update({
      where: { id: input.paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });
    await this.prisma.saleOrder.update({
      where: { id: payment.saleOrderId },
      data: { status: SaleStatus.PAID },
    });
    const sale = await this.prisma.consumerSale.update({
      where: { id: payment.consumerSaleId },
      data: { status: SaleStatus.PAID },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'CONSUMER_SALE_PAID',
      `Sale ${sale.id} marked PAID.`,
    );
    return payment;
  }

  async createConsumerReceipt(data: CreateConsumerReceiptInput) {
    const receipt = await this.prisma.consumerReceipt.create({ data });
    await this.notificationService.createNotification(
      data.issuedById,
      'CONSUMER_RECEIPT_CREATED',
      `Receipt ${receipt.id} created.`,
    );
    return receipt;
  }

  async fulfillConsumerSale(input: { id: string }) {
    const sale = await this.prisma.consumerSale.findUnique({
      where: { id: input.id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    await this.prisma.stockMovement.create({
      data: {
        storeId: sale.storeId,
        direction: MovementDirection.OUT,
        movementType: MovementType.SALE,
        referenceEntity: 'ConsumerSale',
        referenceId: sale.id,
        items: {
          create: sale.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
        },
      },
    });
    for (const item of sale.items) {
      await this.prisma.stock.upsert({
        where: {
          id: undefined,
          AND: [
            {
              storeId: sale.storeId,
            },
            { productVariantId: item.productVariantId },
          ],
        },
        update: { quantity: { decrement: item.quantity } },
        create: {
          storeId: sale.storeId,
          productVariantId: item.productVariantId,
          quantity: -item.quantity,
          reserved: 0,
        },
      });
    }
    const updated = await this.prisma.consumerSale.update({
      where: { id: sale.id },
      data: { status: SaleStatus.FULFILLED },
    });
    await this.notificationService.createNotification(
      updated.billerId,
      'CONSUMER_SALE_FULFILLED',
      `Sale ${updated.id} fulfilled.`,
    );
    return updated;
  }

  // Reseller Sales
  async resellerSales() {
    return this.prisma.resellerSale.findMany({ include: { items: true } });
  }

  async resellerSale(id: string) {
    const sale = await this.prisma.resellerSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Reseller sale not found');
    return sale;
  }

  async createResellerSale(data: CreateResellerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.RESELLER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
    });
    const sale = await this.prisma.resellerSale.create({
      data: {
        SaleOrderid: order.id,
        resellerId: data.resellerId,
        billerId: data.billerId,
        storeId: data.storeId,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'RESELLER_SALE_CREATED',
      `Reseller sale ${sale.id} is pending payment.`,
    );
    return sale;
  }

  async registerResellerPayment(data: CreateResellerPaymentInput) {
    const payment = await this.prisma.resellerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        resellerId: data.resellerId,
        resellerSaleId: data.resellerSaleId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
        reference: data.reference || undefined,
        receivedById: data.receivedById,
      },
    });
    await this.notificationService.createNotification(
      data.receivedById,
      'RESELLER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmResellerPayment(paymentId: string) {
    const payment = await this.prisma.resellerPayment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });
    await this.prisma.saleOrder.update({
      where: { id: payment.saleOrderId },
      data: { status: SaleStatus.PAID },
    });
    const sale = await this.prisma.resellerSale.update({
      where: { id: payment.resellerSaleId! },
      data: { status: SaleStatus.PAID },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'RESELLER_SALE_PAID',
      `Reseller sale ${sale.id} marked PAID.`,
    );
    return payment;
  }

  async createFulfillment(data: CreateFulfillmentInput) {
    const f = await this.prisma.fulfillment.create({ data });
    await this.notificationService.createNotification(
      data.deliveryPersonnelId || data.saleOrderId,
      'FULFILLMENT_CREATED',
      `Fulfillment for order ${data.saleOrderId} created.`,
    );
    return f;
  }
}
