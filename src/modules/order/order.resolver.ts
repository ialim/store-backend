import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

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
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  ordersQuery() {
    return this.orders.orders();
  }

  @Query(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  order(@Args('id') id: string) {
    return this.orders.order(id);
  }

  // Quotation lifecycle
  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.CREATE as string)
  createQuotationDraft(@Args('input') input: CreateQuotationDraftInput) {
    return this.orders.createQuotationDraft(input);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  updateQuotationStatus(@Args('input') input: UpdateQuotationStatusInput) {
    return this.orders.updateQuotationStatus(input);
  }

  // Payments
  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  registerConsumerPayment(@Args('input') input: CreateConsumerPaymentInput) {
    return this.orders.registerConsumerPayment(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.APPROVE as string)
  confirmConsumerPayment(@Args('input') input: ConfirmConsumerPaymentInput) {
    return this.orders.confirmConsumerPayment(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  registerResellerPayment(@Args('input') input: CreateResellerPaymentInput) {
    return this.orders.registerResellerPayment(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.APPROVE as string)
  confirmResellerPayment(@Args('paymentId') paymentId: string) {
    return this.orders.confirmResellerPayment(paymentId);
  }

  // Admin
  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.APPROVE as string)
  adminRevertToQuotation(@Args('saleOrderId') saleOrderId: string) {
    return this.orders.adminRevertToQuotation(saleOrderId);
  }
}
