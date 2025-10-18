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
import {
  Resolver,
  Query,
  Args,
  Mutation,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ProductVariantService } from './product-variant.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { UpsertVariantSupplierCatalogInput } from '../dto/upsert-variant-supplier-catalog.input';
import { SupplierCatalogEntry } from '../../purchase/types/supplier-catalog-entry.type';
import { VariantTierPrice } from '../types/variant-tier-price.type';
import { UpsertVariantTierPriceInput } from '../dto/upsert-variant-tier-price.input';
import {
  LooseProductVariantInput,
  LinkVariantToProductInput,
  UnlinkVariantFromProductInput,
} from '../dto/loose-product-variant.input';
import { ProductVariantWhereInput } from '../../../shared/prismagraphql/product-variant';
import { PERMISSIONS } from '../../../../shared/permissions';
import { AssetService } from '../../asset/asset.service';
import { AssetAssignment } from '../../../shared/prismagraphql/asset-assignment/asset-assignment.model';
import { AssetEntityType } from '@prisma/client';

const toAffectedRows = (payload: unknown): AffectedRows => {
  if (typeof payload === 'object' && payload && 'count' in payload) {
    const countValue = (payload as { count?: number }).count;
    return { count: Number(countValue ?? 0) };
  }
  if (Array.isArray(payload)) {
    return { count: payload.length };
  }
  return { count: 0 };
};
@Resolver(() => ProductVariant)
export class ProductVariantsResolver {
  constructor(
    private readonly ProductVariantService: ProductVariantService,
    private readonly assetService: AssetService,
  ) {}

  @Query(() => ProductVariant, { nullable: true })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  findFirstProductVariant(
    @Args() args: FindFirstProductVariantArgs,
  ): Promise<ProductVariant | null> {
    return this.ProductVariantService.findFirst(args);
  }

  @ResolveField(() => [AssetAssignment])
  assetAssignments(@Parent() variant: ProductVariant) {
    return this.assetService.assignmentsForEntity(
      AssetEntityType.PRODUCT_VARIANT,
      variant.id,
    );
  }

  @ResolveField(() => AssetAssignment, { nullable: true })
  primaryAssetAssignment(@Parent() variant: ProductVariant) {
    return this.assetService.primaryAssignment(
      AssetEntityType.PRODUCT_VARIANT,
      variant.id,
    );
  }

  @ResolveField(() => String, { nullable: true })
  async primaryAssetUrl(@Parent() variant: ProductVariant): Promise<string | null> {
    const assignment = await this.assetService.primaryAssignment(
      AssetEntityType.PRODUCT_VARIANT,
      variant.id,
    );
    return assignment?.asset?.url ?? null;
  }

  @Query(() => ProductVariant, { nullable: true })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  findUniqueProductVariant(
    @Args() args: FindUniqueProductVariantArgs,
  ): Promise<ProductVariant | null> {
    return this.ProductVariantService.findUnique(args);
  }

  @Query(() => [ProductVariant], { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  listProductVariants(
    @Args() args: FindManyProductVariantArgs,
  ): Promise<ProductVariant[]> {
    return this.ProductVariantService.findMany(args);
  }

  @Query(() => [ProductVariantGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async groupByProductVariant(
    @Args() args: ProductVariantGroupByArgs,
  ): Promise<ProductVariantGroupBy[]> {
    const result = (await this.ProductVariantService.groupBy(
      args,
    )) as ProductVariantGroupBy[];
    return result;
  }

  @Query(() => AggregateProductVariant, { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async aggregateProductVariant(
    @Args() args: ProductVariantAggregateArgs,
  ): Promise<AggregateProductVariant> {
    const result = (await this.ProductVariantService.aggregate(
      args,
    )) as AggregateProductVariant;
    return result;
  }

  @Mutation(() => ProductVariant, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  createProductVariant(
    @Args() args: CreateOneProductVariantArgs,
  ): Promise<ProductVariant> {
    return this.ProductVariantService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  async createManyProductVariant(
    @Args() args: CreateManyProductVariantArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductVariantService.createMany(args));
  }

  @Mutation(() => ProductVariant, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  updateProductVariant(
    @Args() args: UpdateOneProductVariantArgs,
  ): Promise<ProductVariant> {
    return this.ProductVariantService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async updateManyProductVariant(
    @Args() args: UpdateManyProductVariantArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductVariantService.updateMany(args));
  }

  @Mutation(() => ProductVariant, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  deleteProductVariant(
    @Args() args: DeleteOneProductVariantArgs,
  ): Promise<ProductVariant> {
    return this.ProductVariantService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  async deleteManyProductVariant(
    @Args() args: DeleteManyProductVariantArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductVariantService.deleteMany(args));
  }

  // Custom catalogue queries
  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  variantsByStore(
    @Args('storeId') storeId: string,
    @Args('search', { nullable: true }) search?: string,
  ): ReturnType<ProductVariantService['variantsByStore']> {
    return this.ProductVariantService.variantsByStore(storeId, search);
  }

  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  lowStockByStore(
    @Args('storeId') storeId: string,
  ): ReturnType<ProductVariantService['lowStockByStore']> {
    return this.ProductVariantService.lowStockByStore(storeId);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  productVariantsCount(
    @Args('where', { nullable: true }) where?: ProductVariantWhereInput,
  ): Promise<number> {
    return this.ProductVariantService.count(where);
  }

  @Mutation(() => SupplierCatalogEntry)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  upsertVariantSupplierCatalog(
    @Args('input') input: UpsertVariantSupplierCatalogInput,
  ): ReturnType<ProductVariantService['upsertVariantSupplierCatalog']> {
    return this.ProductVariantService.upsertVariantSupplierCatalog(input);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  suppliersForVariant(
    @Args('productVariantId') productVariantId: string,
  ): ReturnType<ProductVariantService['suppliersForVariant']> {
    return this.ProductVariantService.suppliersForVariant(productVariantId);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async upsertVariantTierPrice(
    @Args('input') input: UpsertVariantTierPriceInput,
  ): Promise<string> {
    await this.ProductVariantService.upsertVariantTierPrice({
      productVariantId: input.productVariantId,
      tier: input.tier,
      price: input.price,
    });
    return 'OK';
  }

  @Query(() => [VariantTierPrice])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  tierPricesForVariant(
    @Args('productVariantId') productVariantId: string,
  ): ReturnType<ProductVariantService['tierPricesForVariant']> {
    return this.ProductVariantService.tierPricesForVariant(productVariantId);
  }

  // Flexible variant management
  @Mutation(() => ProductVariant)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  createLooseProductVariant(
    @Args('input') input: LooseProductVariantInput,
  ): ReturnType<ProductVariantService['createLoose']> {
    return this.ProductVariantService.createLoose(input);
  }

  @Mutation(() => ProductVariant)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  linkVariantToProduct(
    @Args('input') input: LinkVariantToProductInput,
  ): ReturnType<ProductVariantService['linkToProduct']> {
    return this.ProductVariantService.linkToProduct(
      input.variantId,
      input.productId,
    );
  }

  @Mutation(() => ProductVariant)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  unlinkVariantFromProduct(
    @Args('input') input: UnlinkVariantFromProductInput,
  ): ReturnType<ProductVariantService['unlinkFromProduct']> {
    return this.ProductVariantService.unlinkFromProduct(input.variantId);
  }
}
