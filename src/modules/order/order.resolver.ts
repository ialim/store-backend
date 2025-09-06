import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { OrderService } from './order.service';
import { SaleOrder } from '../../shared/prismagraphql/sale-order/sale-order.model';
import { Quotation } from '../../shared/prismagraphql/quotation/quotation.model';
import { ConsumerPayment } from '../../shared/prismagraphql/consumer-payment/consumer-payment.model';
import { ResellerPayment } from '../../shared/prismagraphql/reseller-payment/reseller-payment.model';

import { CreateQuotationDraftInput } from '../sale/dto/create-quotation-draft.input';
import { UpdateQuotationStatusInput } from '../sale/dto/update-quotation-status.input';
import { CreateConsumerPaymentInput } from '../sale/dto/create-consumer-payment.input';
import { CreateResellerPaymentInput } from '../sale/dto/create-reseller-payment.input';
import { ConfirmConsumerPaymentInput } from '../sale/dto/confirm-consumer-payment.input';

@Resolver()
export class OrderResolver {
  constructor(private readonly orders: OrderService) {}

  // Queries
  @Query(() => [SaleOrder])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  ordersQuery() {
    return this.orders.orders();
  }

  @Query(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  order(@Args('id') id: string) {
    return this.orders.order(id);
  }

  // Quotation lifecycle
  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createQuotationDraft(@Args('input') input: CreateQuotationDraftInput) {
    return this.orders.createQuotationDraft(input);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  updateQuotationStatus(@Args('input') input: UpdateQuotationStatusInput) {
    return this.orders.updateQuotationStatus(input);
  }

  // Payments
  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  registerConsumerPayment(@Args('input') input: CreateConsumerPaymentInput) {
    return this.orders.registerConsumerPayment(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  confirmConsumerPayment(@Args('input') input: ConfirmConsumerPaymentInput) {
    return this.orders.confirmConsumerPayment(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  registerResellerPayment(@Args('input') input: CreateResellerPaymentInput) {
    return this.orders.registerResellerPayment(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  confirmResellerPayment(@Args('paymentId') paymentId: string) {
    return this.orders.confirmResellerPayment(paymentId);
  }

  // Admin
  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  adminRevertToQuotation(@Args('saleOrderId') saleOrderId: string) {
    return this.orders.adminRevertToQuotation(saleOrderId);
  }
}
