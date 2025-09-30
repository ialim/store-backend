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
import { ProductService } from './product.service';

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
  findFirstProduct(
    @Args() args: FindFirstProductArgs,
  ): Promise<Product | null> {
    return this.ProductService.findFirst(args);
  }

  @Query(() => Product, { nullable: true })
  findUniqueProduct(
    @Args() args: FindUniqueProductArgs,
  ): Promise<Product | null> {
    return this.ProductService.findUnique(args);
  }

  @Query(() => [Product], { nullable: false })
  listProducts(@Args() args: FindManyProductArgs): Promise<Product[]> {
    return this.ProductService.findMany(args);
  }

  @Query(() => [ProductGroupBy], { nullable: false })
  async groupByProduct(
    @Args() args: ProductGroupByArgs,
  ): Promise<ProductGroupBy[]> {
    const result = (await this.ProductService.groupBy(
      args,
    )) as ProductGroupBy[];
    return result;
  }

  @Query(() => AggregateProduct, { nullable: false })
  async aggregateProduct(
    @Args() args: ProductAggregateArgs,
  ): Promise<AggregateProduct> {
    const result = (await this.ProductService.aggregate(
      args,
    )) as AggregateProduct;
    return result;
  }

  @Mutation(() => Product, { nullable: true })
  createProduct(@Args() args: CreateOneProductArgs): Promise<Product> {
    return this.ProductService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  async createManyProduct(
    @Args() args: CreateManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.createMany(args));
  }

  @Mutation(() => Product, { nullable: true })
  updateProduct(@Args() args: UpdateOneProductArgs): Promise<Product> {
    return this.ProductService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  async updateManyProduct(
    @Args() args: UpdateManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.updateMany(args));
  }

  @Mutation(() => Product, { nullable: true })
  deleteProduct(@Args() args: DeleteOneProductArgs): Promise<Product> {
    return this.ProductService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  async deleteManyProduct(
    @Args() args: DeleteManyProductArgs,
  ): Promise<AffectedRows> {
    return toAffectedRows(await this.ProductService.deleteMany(args));
  }
}
