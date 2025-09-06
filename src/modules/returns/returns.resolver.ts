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
}

