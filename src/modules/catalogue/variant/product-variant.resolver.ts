import {
  ProductVariant,
  FindFirstProductVariantArgs,
  FindUniqueProductVariantArgs,
  FindManyProductVariantArgs,
  ProductVariantGroupBy,
  ProductVariantGroupByArgs,
  AggregateProductVariant,
  ProductVariantAggregateArgs,
  CreateOneProductVariantArgs,
  CreateManyProductVariantArgs,
  UpdateOneProductVariantArgs,
  UpdateManyProductVariantArgs,
  DeleteOneProductVariantArgs,
  DeleteManyProductVariantArgs,
} from '../../../shared/prismagraphql/product-variant';
import { AffectedRows } from '../../../shared/prismagraphql/prisma';
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { ProductVariantService } from './product-variant.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { UpsertVariantSupplierCatalogInput } from '../dto/upsert-variant-supplier-catalog.input';
import { SupplierCatalogEntry } from '../../purchase/types/supplier-catalog-entry.type';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
@Resolver(() => ProductVariant)
export class ProductVariantsResolver {
  constructor(private readonly ProductVariantService: ProductVariantService) {}

  @Query(() => ProductVariant, { nullable: false })
  findFirstProductVariant(@Args() args: FindFirstProductVariantArgs) {
    this.ProductVariantService.findFirst(args);
  }

  @Query(() => ProductVariant, { nullable: false })
  findUniqueProductVariant(@Args() args: FindUniqueProductVariantArgs) {
    return this.ProductVariantService.findUnique(args);
  }

  @Query(() => [ProductVariant], { nullable: false })
  listProductVariants(@Args() args: FindManyProductVariantArgs) {
    return this.ProductVariantService.findMany(args);
  }

  @Query(() => [ProductVariantGroupBy], { nullable: false })
  groupByProductVariant(@Args() args: ProductVariantGroupByArgs) {
    return this.ProductVariantService.groupBy(args);
  }

  @Query(() => AggregateProductVariant, { nullable: false })
  aggregateProductVariant(@Args() args: ProductVariantAggregateArgs) {
    return this.ProductVariantService.aggregate(args);
  }

  @Mutation(() => ProductVariant, { nullable: true })
  createProductVariant(@Args() args: CreateOneProductVariantArgs) {
    return this.ProductVariantService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  createManyProductVariant(@Args() args: CreateManyProductVariantArgs) {
    return this.ProductVariantService.createMany(args);
  }

  @Mutation(() => ProductVariant, { nullable: true })
  updateProductVariant(@Args() args: UpdateOneProductVariantArgs) {
    return this.ProductVariantService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  updateManyProductVariant(@Args() args: UpdateManyProductVariantArgs) {
    return this.ProductVariantService.updateMany(args);
  }

  @Mutation(() => ProductVariant, { nullable: true })
  deleteProductVariant(@Args() args: DeleteOneProductVariantArgs) {
    return this.ProductVariantService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  deleteManyProductVariant(@Args() args: DeleteManyProductVariantArgs) {
    return this.ProductVariantService.deleteMany(args);
  }


  // Custom catalogue queries
  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard)
  variantsByStore(
    @Args('storeId') storeId: string,
    @Args('search', { nullable: true }) search?: string,
  ) {
    return this.ProductVariantService.variantsByStore(storeId, search);
  }

  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard)
  lowStockByStore(@Args('storeId') storeId: string) {
    return this.ProductVariantService.lowStockByStore(storeId);
  }

  @Mutation(() => SupplierCatalogEntry)
  @UseGuards(GqlAuthGuard)
  upsertVariantSupplierCatalog(
    @Args('input') input: UpsertVariantSupplierCatalogInput,
  ) {
    return this.ProductVariantService.upsertVariantSupplierCatalog(input);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard)
  suppliersForVariant(@Args('productVariantId') productVariantId: string) {
    return this.ProductVariantService.suppliersForVariant(productVariantId);
  }

  // Custom catalogue queries
  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard)
  variantsByStore(
    @Args('storeId') storeId: string,
    @Args('search', { nullable: true }) search?: string,
  ) {
    return this.ProductVariantService.variantsByStore(storeId, search);
  }

  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard)
  lowStockByStore(@Args('storeId') storeId: string) {
    return this.ProductVariantService.lowStockByStore(storeId);
  }
}
