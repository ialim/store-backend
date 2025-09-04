import {
  ProductCategory,
  FindFirstProductCategoryArgs,
  FindUniqueProductCategoryArgs,
  FindManyProductCategoryArgs,
  ProductCategoryGroupBy,
  ProductCategoryGroupByArgs,
  AggregateProductCategory,
  ProductCategoryAggregateArgs,
  CreateOneProductCategoryArgs,
  CreateManyProductCategoryArgs,
  UpdateOneProductCategoryArgs,
  UpdateManyProductCategoryArgs,
  DeleteOneProductCategoryArgs,
  DeleteManyProductCategoryArgs,
} from '../../../shared/prismagraphql/product-category';
import { AffectedRows } from '../../../shared/prismagraphql/prisma';
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { ProductCategoryService } from './product-category.service';
@Resolver(() => ProductCategory)
export class ProductCategorysResolver {
  constructor(
    private readonly ProductCategoryService: ProductCategoryService,
  ) {}

  @Query(() => ProductCategory, { nullable: false })
  findFirstProductCategory(@Args() args: FindFirstProductCategoryArgs) {
    this.ProductCategoryService.findFirst(args);
  }

  @Query(() => ProductCategory, { nullable: false })
  findUniqueProductCategory(@Args() args: FindUniqueProductCategoryArgs) {
    return this.ProductCategoryService.findUnique(args);
  }

  @Query(() => [ProductCategory], { nullable: false })
  listProductCategorys(@Args() args: FindManyProductCategoryArgs) {
    return this.ProductCategoryService.findMany(args);
  }

  @Query(() => [ProductCategoryGroupBy], { nullable: false })
  groupByProductCategory(@Args() args: ProductCategoryGroupByArgs) {
    return this.ProductCategoryService.groupBy(args);
  }

  @Query(() => AggregateProductCategory, { nullable: false })
  aggregateProductCategory(@Args() args: ProductCategoryAggregateArgs) {
    return this.ProductCategoryService.aggregate(args);
  }

  @Mutation(() => ProductCategory, { nullable: true })
  createProductCategory(@Args() args: CreateOneProductCategoryArgs) {
    return this.ProductCategoryService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  createManyProductCategory(@Args() args: CreateManyProductCategoryArgs) {
    return this.ProductCategoryService.createMany(args);
  }

  @Mutation(() => ProductCategory, { nullable: true })
  updateProductCategory(@Args() args: UpdateOneProductCategoryArgs) {
    return this.ProductCategoryService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  updateManyProductCategory(@Args() args: UpdateManyProductCategoryArgs) {
    return this.ProductCategoryService.updateMany(args);
  }

  @Mutation(() => ProductCategory, { nullable: true })
  deleteProductCategory(@Args() args: DeleteOneProductCategoryArgs) {
    return this.ProductCategoryService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  deleteManyProductCategory(@Args() args: DeleteManyProductCategoryArgs) {
    return this.ProductCategoryService.deleteMany(args);
  }
}
