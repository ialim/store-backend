import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import { ReturnsService } from './returns.service';
import { CreateSalesReturnInput } from './dto/create-sales-return.input';
import { UpdateSalesReturnStatusInput } from './dto/update-sales-return-status.input';
import { CreatePurchaseReturnInput } from './dto/create-purchase-return.input';
import { FulfillPurchaseReturnInput } from './dto/fulfill-purchase-return.input';
import { SalesReturn } from '../../shared/prismagraphql/sales-return/sales-return.model';
import { PurchaseReturn } from '../../shared/prismagraphql/purchase-return/purchase-return.model';
import { CreateOrderReturnInput } from './dto/create-order-return.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';

@Resolver()
export class ReturnsResolver {
  constructor(private returns: ReturnsService) {}

  // Create a sales return request (partial or full)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createSalesReturn(
    @Args('input') input: CreateSalesReturnInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returns.createSalesReturn({ input, user });
  }

  // Update sales return status (accept/reject/fulfill)
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.return.UPDATE as string)
  updateSalesReturnStatus(@Args('input') input: UpdateSalesReturnStatusInput) {
    return this.returns.updateSalesReturnStatus(input);
  }

  // Create a sales return using orderId (helper)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER', 'BILLER', 'ACCOUNTANT', 'MANAGER', 'ADMIN', 'SUPERADMIN')
  createSalesReturnForOrder(
    @Args('input') input: CreateOrderReturnInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returns.createSalesReturnForOrder({ input, user });
  }

  // Create a purchase return (partial or full)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.return.CREATE as string)
  createPurchaseReturn(@Args('input') input: CreatePurchaseReturnInput) {
    return this.returns.createPurchaseReturn(input);
  }

  // Fulfill purchase return (apply stock movement)
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.return.UPDATE as string)
  fulfillPurchaseReturn(@Args('input') input: FulfillPurchaseReturnInput) {
    return this.returns.fulfillPurchaseReturn(input);
  }

  // Listings
  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.return.READ as string)
  salesReturnsByStore(@Args('storeId') storeId: string) {
    return this.returns.salesReturnsByStore(storeId);
  }

  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.return.READ as string)
  salesReturnsByConsumerSale(@Args('consumerSaleId') consumerSaleId: string) {
    return this.returns.salesReturnsByConsumerSale(consumerSaleId);
  }

  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.return.READ as string)
  salesReturnsByResellerSale(@Args('resellerSaleId') resellerSaleId: string) {
    return this.returns.salesReturnsByResellerSale(resellerSaleId);
  }

  @Query(() => [PurchaseReturn])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.return.READ as string)
  purchaseReturnsBySupplier(@Args('supplierId') supplierId: string) {
    return this.returns.purchaseReturnsBySupplier(supplierId);
  }
}
