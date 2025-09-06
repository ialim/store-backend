import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalesService } from '../sale/sale.service';
import { CreateQuotationDraftInput } from '../sale/dto/create-quotation-draft.input';
import { UpdateQuotationStatusInput } from '../sale/dto/update-quotation-status.input';
import { CreateConsumerPaymentInput } from '../sale/dto/create-consumer-payment.input';
import { CreateResellerPaymentInput } from '../sale/dto/create-reseller-payment.input';
import { ConfirmConsumerPaymentInput } from '../sale/dto/confirm-consumer-payment.input';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private sales: SalesService,
  ) {}

  // Queries
  async orders() {
    return this.prisma.saleOrder.findMany({ include: { fulfillment: true } });
  }

  async order(id: string) {
    const o = await this.prisma.saleOrder.findUnique({
      where: { id },
      include: { fulfillment: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  // Quotation lifecycle
  createQuotationDraft(input: CreateQuotationDraftInput) {
    return this.sales.createQuotationDraft(input);
  }

  updateQuotationStatus(input: UpdateQuotationStatusInput) {
    return this.sales.updateQuotationStatus(input);
  }

  // Payments
  registerConsumerPayment(input: CreateConsumerPaymentInput) {
    return this.sales.registerConsumerPayment(input);
  }

  confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    return this.sales.confirmConsumerPayment(input);
  }

  registerResellerPayment(input: CreateResellerPaymentInput) {
    return this.sales.registerResellerPayment(input);
  }

  confirmResellerPayment(paymentId: string) {
    return this.sales.confirmResellerPayment(paymentId);
  }

  // Admin
  adminRevertToQuotation(orderId: string) {
    return this.sales.adminRevertOrderToQuotation(orderId);
  }
}
