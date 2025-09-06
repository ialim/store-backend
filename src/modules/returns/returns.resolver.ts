import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReturnsService } from './returns.service';
import { CreateSalesReturnInput } from './dto/create-sales-return.input';
import { UpdateSalesReturnStatusInput } from './dto/update-sales-return-status.input';
import { CreatePurchaseReturnInput } from './dto/create-purchase-return.input';
import { FulfillPurchaseReturnInput } from './dto/fulfill-purchase-return.input';
import { SalesReturn } from '../../shared/prismagraphql/sales-return/sales-return.model';
import { PurchaseReturn } from '../../shared/prismagraphql/purchase-return/purchase-return.model';
import { CreateOrderReturnInput } from './dto/create-order-return.input';

@Resolver()
export class ReturnsResolver {
  constructor(private returns: ReturnsService) {}

  // Create a sales return request (partial or full)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  createSalesReturn(@Args('input') input: CreateSalesReturnInput) {
    return this.returns.createSalesReturn(input);
  }

  // Update sales return status (accept/reject/fulfill)
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updateSalesReturnStatus(@Args('input') input: UpdateSalesReturnStatusInput) {
    return this.returns.updateSalesReturnStatus(input);
  }

  // Create a sales return using orderId (helper)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  createSalesReturnForOrder(@Args('input') input: CreateOrderReturnInput) {
    return this.returns.createSalesReturnForOrder(input);
  }

  // Create a purchase return (partial or full)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  createPurchaseReturn(@Args('input') input: CreatePurchaseReturnInput) {
    return this.returns.createPurchaseReturn(input);
  }

  // Fulfill purchase return (apply stock movement)
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  fulfillPurchaseReturn(@Args('input') input: FulfillPurchaseReturnInput) {
    return this.returns.fulfillPurchaseReturn(input);
  }

  // Listings
  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard)
  salesReturnsByStore(@Args('storeId') storeId: string) {
    return (this.returns as any).prisma.salesReturn.findMany({
      where: { storeId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard)
  salesReturnsByConsumerSale(@Args('consumerSaleId') consumerSaleId: string) {
    return (this.returns as any).prisma.salesReturn.findMany({
      where: { consumerSaleId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Query(() => [SalesReturn])
  @UseGuards(GqlAuthGuard)
  salesReturnsByResellerSale(@Args('resellerSaleId') resellerSaleId: string) {
    return (this.returns as any).prisma.salesReturn.findMany({
      where: { resellerSaleId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Query(() => [PurchaseReturn])
  @UseGuards(GqlAuthGuard)
  purchaseReturnsBySupplier(@Args('supplierId') supplierId: string) {
    return (this.returns as any).prisma.purchaseReturn.findMany({
      where: { supplierId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
