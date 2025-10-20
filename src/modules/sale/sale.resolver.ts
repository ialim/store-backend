import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

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
import { UpdateFulfillmentPreferencesInput } from './dto/update-fulfillment-preferences.input';
import { AssignFulfillmentPersonnelInput } from './dto/assign-fulfillment-personnel.input';
import { UpdateFulfillmentStatusInput } from './dto/update-fulfillment-status.input';
import { RecordFulfillmentPaymentInput } from './dto/record-fulfillment-payment.input';
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
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Resolver()
export class SalesResolver {
  constructor(
    private readonly salesService: SalesService,
    private readonly prisma: PrismaService,
  ) {}

  // Quotation flow
  // NOTE: Quotation/order mutations are now available under OrderResolver as well.
  // Keeping existing endpoints for compatibility during migration.
  @Mutation(() => Quotation, {
    description: 'Deprecated: use order.createQuotationDraft',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  createQuotationDraft(@Args('input') input: CreateQuotationDraftInput) {
    return this.salesService.createQuotationDraft(input);
  }

  @Mutation(() => Quotation, {
    description: 'Deprecated: use order.updateQuotationStatus',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'CONSUMER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  updateQuotationStatus(@Args('input') input: UpdateQuotationStatusInput) {
    return this.salesService.updateQuotationStatus(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('CONSUMER', 'BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  checkoutConsumerQuotation(
    @Args('input') input: CheckoutConsumerQuotationInput,
  ) {
    return this.salesService.checkoutConsumerQuotation(input);
  }

  @Mutation(() => ResellerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  confirmResellerQuotation(
    @Args('input') input: ConfirmResellerQuotationInput,
  ) {
    return this.salesService.confirmResellerQuotation(input);
  }

  @Mutation(() => Quotation)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.APPROVE as string)
  billerConvertConfirmedQuotation(
    @Args('input') input: BillerConvertQuotationInput,
  ) {
    return this.salesService.billerConvertConfirmedQuotation(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  createConsumerSale(@Args('input') input: CreateConsumerSaleInput) {
    return this.salesService.createConsumerSale(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  registerConsumerPayment(@Args('input') input: CreateConsumerPaymentInput) {
    return this.salesService.registerConsumerPayment(input);
  }

  @Mutation(() => ConsumerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.APPROVE as string)
  confirmConsumerPayment(@Args('input') input: ConfirmConsumerPaymentInput) {
    return this.salesService.confirmConsumerPayment(input);
  }

  @Mutation(() => ConsumerReceipt)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  createConsumerReceipt(@Args('input') input: CreateConsumerReceiptInput) {
    return this.salesService.createConsumerReceipt(input);
  }

  @Mutation(() => ConsumerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  fulfillConsumerSale(@Args('input') input: FulfillConsumerSaleInput) {
    return this.salesService.fulfillConsumerSale(input);
  }

  @Mutation(() => ResellerSale)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  createResellerSale(@Args('input') input: CreateResellerSaleInput) {
    return this.salesService.createResellerSale(input);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  registerResellerPayment(
    @Args('input') input: CreateResellerPaymentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.registerResellerPayment(input, user);
  }

  @Mutation(() => ResellerPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ACCOUNTANT', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.APPROVE as string)
  confirmResellerPayment(@Args('paymentId') paymentId: string) {
    return this.salesService.confirmResellerPayment(paymentId);
  }

  @Mutation(() => Fulfillment, {
    description:
      'Assign delivery personnel to a fulfillment and set status to ASSIGNED',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.CREATE as string)
  createFulfillment(@Args('input') input: CreateFulfillmentInput) {
    return this.salesService.createFulfillment(input);
  }

  @Mutation(() => SaleOrder, {
    description:
      'Update fulfillment preferences (type, delivery address) for a sale order.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  updateFulfillmentPreferences(
    @Args('input') input: UpdateFulfillmentPreferencesInput,
  ) {
    return this.salesService.updateFulfillmentPreferences(input);
  }

  @Mutation(() => Fulfillment, {
    description:
      'Update fulfillment status (ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED). If DELIVERED and a PIN is set, confirmationPin is required.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  assignFulfillmentPersonnel(
    @Args('input') input: AssignFulfillmentPersonnelInput,
  ) {
    return this.salesService.assignFulfillmentPersonnel(input);
  }

  @Mutation(() => Fulfillment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  updateFulfillmentStatus(@Args('input') input: UpdateFulfillmentStatusInput) {
    return this.salesService.updateFulfillmentStatus(input);
  }

  @Mutation(() => Fulfillment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  recordFulfillmentPayment(
    @Args('input') input: RecordFulfillmentPaymentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.recordFulfillmentPayment(input, user);
  }

  @Mutation(() => SaleOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.APPROVE as string)
  adminRevertOrderToQuotation(@Args('saleOrderId') saleOrderId: string) {
    return this.salesService.adminRevertOrderToQuotation(saleOrderId);
  }

  // Admin queries for customer history
  @Query(() => [ConsumerSale])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.READ as string)
  consumerSalesByCustomer(
    @Args('customerId') customerId: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('order', { nullable: true }) order?: 'asc' | 'desc',
    @Args('cursorId', { nullable: true }) cursorId?: string,
  ) {
    const where: Prisma.ConsumerSaleWhereInput = {
      CustomerProfile: { some: { userId: customerId } },
    };
    const orderBy: Prisma.ConsumerSaleOrderByWithRelationInput = {
      createdAt: order === 'asc' ? 'asc' : 'desc',
    };
    const args: Prisma.ConsumerSaleFindManyArgs = {
      where,
      orderBy,
      take: take ?? 20,
      skip: skip ?? 0,
      include: { items: true, store: true },
    };
    if (cursorId) {
      args.cursor = { id: cursorId };
      // When using cursor pagination, skip the cursor row itself by default
      if (!skip) args.skip = 1;
    }
    return this.prisma.consumerSale.findMany(args);
  }

  @Query(() => [ConsumerReceipt])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.sale.READ as string)
  consumerReceiptsByCustomer(
    @Args('customerId') customerId: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('order', { nullable: true }) order?: 'asc' | 'desc',
    @Args('cursorId', { nullable: true }) cursorId?: string,
  ) {
    const where: Prisma.ConsumerReceiptWhereInput = {
      sale: { CustomerProfile: { some: { userId: customerId } } },
    };
    const orderBy: Prisma.ConsumerReceiptOrderByWithRelationInput = {
      issuedAt: order === 'asc' ? 'asc' : 'desc',
    };
    const args: Prisma.ConsumerReceiptFindManyArgs = {
      where,
      orderBy,
      take: take ?? 20,
      skip: skip ?? 0,
    };
    if (cursorId) {
      args.cursor = { id: cursorId };
      if (!skip) args.skip = 1;
    }
    return this.prisma.consumerReceipt.findMany(args);
  }
}
