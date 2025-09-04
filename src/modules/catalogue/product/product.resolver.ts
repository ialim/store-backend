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
@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly ProductService: ProductService) {}

  @Query(() => Product, { nullable: false })
  findFirstProduct(@Args() args: FindFirstProductArgs) {
    this.ProductService.findFirst(args);
  }

  @Query(() => Product, { nullable: false })
  findUniqueProduct(@Args() args: FindUniqueProductArgs) {
    return this.ProductService.findUnique(args);
  }

  @Query(() => [Product], { nullable: false })
  listProducts(@Args() args: FindManyProductArgs) {
    return this.ProductService.findMany(args);
  }

  @Query(() => [ProductGroupBy], { nullable: false })
  groupByProduct(@Args() args: ProductGroupByArgs) {
    return this.ProductService.groupBy(args);
  }

  @Query(() => AggregateProduct, { nullable: false })
  aggregateProduct(@Args() args: ProductAggregateArgs) {
    return this.ProductService.aggregate(args);
  }

  @Mutation(() => Product, { nullable: true })
  createProduct(@Args() args: CreateOneProductArgs) {
    const product = this.ProductService.create(args);
    console.log(args, product);
    return product;
  }

  @Mutation(() => AffectedRows, { nullable: true })
  createManyProduct(@Args() args: CreateManyProductArgs) {
    return this.ProductService.createMany(args);
  }

  @Mutation(() => Product, { nullable: true })
  updateProduct(@Args() args: UpdateOneProductArgs) {
    return this.ProductService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  updateManyProduct(@Args() args: UpdateManyProductArgs) {
    return this.ProductService.updateMany(args);
  }

  @Mutation(() => Product, { nullable: true })
  deleteProduct(@Args() args: DeleteOneProductArgs) {
    return this.ProductService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  deleteManyProduct(@Args() args: DeleteManyProductArgs) {
    return this.ProductService.deleteMany(args);
  }
}
