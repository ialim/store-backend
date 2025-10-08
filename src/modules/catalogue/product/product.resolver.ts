import {
  Product,
  FindFirstProductArgs,
  FindUniqueProductArgs,
  FindManyProductArgs,
  ProductGroupBy,
  ProductGroupByArgs,
  AggregateProduct,
  ProductAggregateArgs,
  CreateOneProductArgs,
  CreateManyProductArgs,
  UpdateOneProductArgs,
  UpdateManyProductArgs,
  DeleteOneProductArgs,
  DeleteManyProductArgs,
} from '../../../shared/prismagraphql/product';
import { AffectedRows } from '../../../shared/prismagraphql/prisma';
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../shared/permissions';

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
@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly ProductService: ProductService) {}

  @Query(() => Product, { nullable: true })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  findFirstProduct(
    @Args() args: FindFirstProductArgs,
  ): Promise<Product | null> {
    return this.ProductService.findFirst(args);
  }

  @Query(() => Product, { nullable: true })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  findUniqueProduct(
    @Args() args: FindUniqueProductArgs,
  ): Promise<Product | null> {
    return this.ProductService.findUnique(args);
  }

  @Query(() => [Product], { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  listProducts(@Args() args: FindManyProductArgs): Promise<Product[]> {
    return this.ProductService.findMany(args);
  }

  @Query(() => [ProductGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async groupByProduct(
    @Args() args: ProductGroupByArgs,
  ): Promise<ProductGroupBy[]> {
    const result = (await this.ProductService.groupBy(
      args,
    )) as ProductGroupBy[];
    return result;
  }

  @Query(() => AggregateProduct, { nullable: false })
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async aggregateProduct(
    @Args() args: ProductAggregateArgs,
  ): Promise<AggregateProduct> {
    const result = (await this.ProductService.aggregate(
      args,
    )) as AggregateProduct;
    return result;
  }

  @Mutation(() => Product, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  createProduct(@Args() args: CreateOneProductArgs): Promise<Product> {
    return this.ProductService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  async createManyProduct(
    @Args() args: CreateManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.createMany(args));
  }

  @Mutation(() => Product, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  updateProduct(@Args() args: UpdateOneProductArgs): Promise<Product> {
    return this.ProductService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async updateManyProduct(
    @Args() args: UpdateManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.updateMany(args));
  }

  @Mutation(() => Product, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  deleteProduct(@Args() args: DeleteOneProductArgs): Promise<Product> {
    return this.ProductService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  async deleteManyProduct(
    @Args() args: DeleteManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.deleteMany(args));
  }
}
