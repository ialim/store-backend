import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BaseCrudService } from '../../base.services';
import {
  CreateManyProductCategoryArgs,
  CreateOneProductCategoryArgs,
  DeleteManyProductCategoryArgs,
  DeleteOneProductCategoryArgs,
  FindFirstProductCategoryArgs,
  FindManyProductCategoryArgs,
  FindUniqueProductCategoryArgs,
  UpdateManyProductCategoryArgs,
  UpdateOneProductCategoryArgs,
  ProductCategory,
  ProductCategoryAggregateArgs,
  ProductCategoryGroupByArgs,
} from '../../../shared/prismagraphql/product-category';
@Injectable()
export class ProductCategoryService extends BaseCrudService<
  ProductCategory,
  FindFirstProductCategoryArgs,
  FindUniqueProductCategoryArgs,
  FindManyProductCategoryArgs,
  ProductCategoryGroupByArgs,
  ProductCategoryAggregateArgs,
  CreateOneProductCategoryArgs,
  CreateManyProductCategoryArgs,
  UpdateOneProductCategoryArgs,
  UpdateManyProductCategoryArgs,
  DeleteOneProductCategoryArgs,
  DeleteManyProductCategoryArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
