import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Supplier } from '../../shared/prismagraphql/supplier';
import { PurchaseOrder } from '../../shared/prismagraphql/purchase-order';
import { SupplierPayment } from '../../shared/prismagraphql/supplier-payment';
import { PurchaseService } from './purchase.service';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';

@Resolver()
export class PurchaseResolver {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Query(() => [Supplier])
  @UseGuards(GqlAuthGuard)
  suppliers() {
    return this.purchaseService.suppliers();
  }

  @Query(() => Supplier)
  @UseGuards(GqlAuthGuard)
  supplier(@Args('id') id: string) {
    return this.purchaseService.supplier(id);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createSupplier(@Args('input') input: CreateSupplierInput) {
    return this.purchaseService.createSupplier(input);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updateSupplier(@Args('input') input: UpdateSupplierInput) {
    return this.purchaseService.updateSupplier(input);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrders() {
    return this.purchaseService.purchaseOrders();
  }

  @Query(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard)
  purchaseOrder(@Args('id') id: string) {
    return this.purchaseService.purchaseOrder(id);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createPurchaseOrder(@Args('input') input: CreatePurchaseOrderInput) {
    return this.purchaseService.createPurchaseOrder(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updatePurchaseOrderStatus(
    @Args('input') input: UpdatePurchaseOrderStatusInput,
  ) {
    return this.purchaseService.updatePurchaseOrderStatus(input);
  }

  @Query(() => [SupplierPayment])
  @UseGuards(GqlAuthGuard)
  supplierPayments() {
    return this.purchaseService.supplierPayments();
  }

  @Mutation(() => SupplierPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createSupplierPayment(@Args('input') input: CreateSupplierPaymentInput) {
    return this.purchaseService.createSupplierPayment(input);
  }
}
