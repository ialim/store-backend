import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ConsumerSale } from '../../shared/prismagraphql/consumer-sale';
import { ConsumerPayment } from '../../shared/prismagraphql/consumer-payment';
import { ConsumerReceipt } from '../../shared/prismagraphql/consumer-receipt';
import { ResellerSale } from '../../shared/prismagraphql/reseller-sale';
import { ResellerPayment } from '../../shared/prismagraphql/reseller-payment';
import { Fulfillment } from '../../shared/prismagraphql/fulfillment';
import { SalesService } from './sale.service';

import { CreateConsumerSaleInput } from './dto/create-consumer-sale.input';
import { CreateConsumerPaymentInput } from './dto/create-consumer-payment.input';
import { ConfirmConsumerPaymentInput } from './dto/confirm-consumer-payment.input';
import { CreateConsumerReceiptInput } from './dto/create-consumer-receipt.input';
import { CreateFulfillmentInput } from './dto/create-fulfillment.input';
import { AssignFulfillmentPersonnelInput } from './dto/assign-fulfillment-personnel.input';
import { UpdateFulfillmentStatusInput } from './dto/update-fulfillment-status.input';
import { CreateResellerSaleInput } from './dto/create-reseller-sale.input';
import { CreateResellerPaymentInput } from './dto/create-reseller-payment.input';
import { Quotation } from '../../shared/prismagraphql/quotation/quotation.model';
import { UpdateQuotationStatusInput } from './dto/update-quotation-status.input';
import { CreateQuotationDraftInput } from './dto/create-quotation-draft.input';
import { CheckoutConsumerQuotationInput } from './dto/checkout-consumer-quotation.input';
import { ConfirmResellerQuotationInput } from './dto/confirm-reseller-quotation.input';
import { BillerConvertQuotationInput } from './dto/biller-convert-quotation.input';
import { FulfillConsumerSaleInput } from './dto/fulfill-consumer-sale.input';
import { SaleOrder } from '../../shared/prismagraphql/sale-order/sale-order.model';

@Resolver()
export class SalesResolver {
  constructor(private readonly salesService: SalesService) {}

  // Quotation flow
  // NOTE: Quotation/order mutations are now available under OrderResolver as well.
  // Keeping existing endpoints for compatibility during migration.
  @Mutation(() => Quotation, {
    description: 'Deprecated: use order.createQuotationDraft',
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createQuotationDraft(@Args('input') input: CreateQuotationDraftInput) {
    return this.salesService.createQuotationDraft(input);
  }

  @Mutation(() => Quotation, {
    description: 'Deprecated: use order.updateQuotationStatus',
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  updateQuotationStatus(@Args('input') input: UpdateQuotationStatusInput) {
    return this.salesService.updateQuotationStatus(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('CONSUMER', 'BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  checkoutConsumerQuotation(
    @Args('input') input: CheckoutConsumerQuotationInput,
  ) {
    return this.salesService.checkoutConsumerQuotation(input);
  }

  @Mutation(() => ResellerSale)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  confirmResellerQuotation(
    @Args('input') input: ConfirmResellerQuotationInput,
  ) {
    return this.salesService.confirmResellerQuotation(input);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  billerConvertConfirmedQuotation(
    @Args('input') input: BillerConvertQuotationInput,
  ) {
    return this.salesService.billerConvertConfirmedQuotation(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createConsumerSale(@Args('input') input: CreateConsumerSaleInput) {
    return this.salesService.createConsumerSale(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  registerConsumerPayment(@Args('input') input: CreateConsumerPaymentInput) {
    return this.salesService.registerConsumerPayment(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  confirmConsumerPayment(@Args('input') input: ConfirmConsumerPaymentInput) {
    return this.salesService.confirmConsumerPayment(input);
  }

  @Mutation(() => ConsumerReceipt)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createConsumerReceipt(@Args('input') input: CreateConsumerReceiptInput) {
    return this.salesService.createConsumerReceipt(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  fulfillConsumerSale(@Args('input') input: FulfillConsumerSaleInput) {
    return this.salesService.fulfillConsumerSale(input);
  }

  @Mutation(() => ResellerSale)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createResellerSale(@Args('input') input: CreateResellerSaleInput) {
    return this.salesService.createResellerSale(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  registerResellerPayment(@Args('input') input: CreateResellerPaymentInput) {
    return this.salesService.registerResellerPayment(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  confirmResellerPayment(@Args('paymentId') paymentId: string) {
    return this.salesService.confirmResellerPayment(paymentId);
  }

  @Mutation(() => Fulfillment, { description: 'Assign delivery personnel to a fulfillment and set status to ASSIGNED' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createFulfillment(@Args('input') input: CreateFulfillmentInput) {
    return this.salesService.createFulfillment(input);
  }

  @Mutation(() => Fulfillment, { description: 'Update fulfillment status (ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED). If DELIVERED and a PIN is set, confirmationPin is required.' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN', 'SUPERADMIN')
  assignFulfillmentPersonnel(
    @Args('input') input: AssignFulfillmentPersonnelInput,
  ) {
    return this.salesService.assignFulfillmentPersonnel(input);
  }

  @Mutation(() => Fulfillment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN', 'SUPERADMIN')
  updateFulfillmentStatus(
    @Args('input') input: UpdateFulfillmentStatusInput,
  ) {
    return this.salesService.updateFulfillmentStatus(input);
  }

  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  adminRevertOrderToQuotation(@Args('saleOrderId') saleOrderId: string) {
    return this.salesService.adminRevertOrderToQuotation(saleOrderId);
  }
}
