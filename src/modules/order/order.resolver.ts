import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

import { OrderService } from './order.service';
import { SaleOrder } from '../../shared/prismagraphql/sale-order/sale-order.model';
import { Quotation } from '../../shared/prismagraphql/quotation/quotation.model';
import { ConsumerPayment } from '../../shared/prismagraphql/consumer-payment/consumer-payment.model';
import { ResellerPayment } from '../../shared/prismagraphql/reseller-payment/reseller-payment.model';
import { ConsumerSale } from '../../shared/prismagraphql/consumer-sale/consumer-sale.model';
import { ResellerSale } from '../../shared/prismagraphql/reseller-sale/reseller-sale.model';
import { QuotationViewContext } from './dto/quotation-context.model';
import { Fulfillment } from '../../shared/prismagraphql/fulfillment/fulfillment.model';
import { FulfillmentStatus } from '../../shared/prismagraphql/prisma/fulfillment-status.enum';

import { CreateQuotationDraftInput } from '../sale/dto/create-quotation-draft.input';
import { UpdateQuotationStatusInput } from '../sale/dto/update-quotation-status.input';
import { UpdateQuotationInput } from '../sale/dto/update-quotation.input';
import { CreateConsumerPaymentInput } from '../sale/dto/create-consumer-payment.input';
import { CreateResellerPaymentInput } from '../sale/dto/create-reseller-payment.input';
import { ConfirmConsumerPaymentInput } from '../sale/dto/confirm-consumer-payment.input';
import { GrantAdminOverrideInput } from './dto/grant-admin-override.input';
import { GrantCreditOverrideInput } from './dto/grant-credit-override.input';
import { SaleWorkflowSnapshot } from './dto/sale-workflow-snapshot.model';
import { FulfilmentWorkflowSnapshot } from './dto/fulfilment-workflow-snapshot.model';
import { SaleWorkflowSummary } from './dto/sale-workflow-summary.model';

@Resolver()
export class OrderResolver {
  constructor(private readonly orders: OrderService) {}

  // Queries
  @Query(() => [SaleOrder])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  ordersQuery(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.orders(user);
  }

  @Query(() => [Quotation])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  quotations(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.quotations(user);
  }

  @Query(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  quotation(@Args('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.quotation(id, user);
  }

  @Query(() => QuotationViewContext)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  quotationContext(
    @Args('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.quotationContext(id, user);
  }

  @Query(() => [ConsumerSale])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  consumerSales() {
    return this.orders.consumerSales();
  }

  @Query(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  consumerSale(@Args('id') id: string) {
    return this.orders.consumerSale(id);
  }

  @Query(() => [ResellerSale])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  resellerSales(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.resellerSales(user);
  }

  @Query(() => ResellerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  resellerSale(@Args('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.resellerSale(id, user);
  }

  @Query(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  order(@Args('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.order(id, user);
  }

  // Quotation lifecycle
  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.CREATE as string)
  createQuotationDraft(
    @Args('input') input: CreateQuotationDraftInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.createQuotationDraft(input, user);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  updateQuotationStatus(
    @Args('input') input: UpdateQuotationStatusInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.updateQuotationStatus(input, user);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  updateQuotation(
    @Args('input') input: UpdateQuotationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.updateQuotation(input, user);
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

  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.order.APPROVE as string)
  grantAdminOverride(
    @Args('input') input: GrantAdminOverrideInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.grantAdminOverride(input, user);
  }

  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.order.APPROVE as string)
  grantCreditOverride(
    @Args('input') input: GrantCreditOverrideInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.grantCreditOverride(input, user);
  }

  @Query(() => SaleWorkflowSnapshot)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  saleWorkflow(
    @Args('saleOrderId') saleOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.saleWorkflow(saleOrderId, user);
  }

  @Query(() => [Fulfillment])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  fulfillmentsInProgress(
    @Args('statuses', {
      type: () => [FulfillmentStatus],
      nullable: true,
    })
    statuses: FulfillmentStatus[] | null,
    @Args('storeId', { type: () => String, nullable: true })
    storeId: string | null,
    @Args('search', { type: () => String, nullable: true })
    search: string | null,
    @Args('take', { type: () => Int, nullable: true }) take: number | null,
  ) {
    return this.orders.fulfillmentsInProgress({
      statuses,
      storeId,
      search,
      take,
    });
  }

  @Query(() => SaleWorkflowSummary, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  creditCheck(
    @Args('saleOrderId') saleOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.creditCheck(saleOrderId, user);
  }

  @Query(() => FulfilmentWorkflowSnapshot, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.READ as string)
  fulfilmentWorkflow(
    @Args('saleOrderId') saleOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.fulfilmentWorkflow(saleOrderId, user);
  }
}
