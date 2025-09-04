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
import { CreateResellerSaleInput } from './dto/create-reseller-sale.input';
import { CreateResellerPaymentInput } from './dto/create-reseller-payment.input';

@Resolver()
export class SalesResolver {
  constructor(private readonly salesService: SalesService) {}

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
  fulfillConsumerSale(@Args('input') input: { id: string }) {
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

  @Mutation(() => Fulfillment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createFulfillment(@Args('input') input: CreateFulfillmentInput) {
    return this.salesService.createFulfillment(input);
  }
}
