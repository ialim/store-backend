import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BaseCrudService } from '../../base.services';
import {
  CreateManyProductArgs,
  CreateOneProductArgs,
  DeleteManyProductArgs,
  DeleteOneProductArgs,
  FindFirstProductArgs,
  FindManyProductArgs,
  FindUniqueProductArgs,
  UpdateManyProductArgs,
  UpdateOneProductArgs,
  Product,
  ProductAggregateArgs,
  ProductGroupByArgs,
} from '../../../shared/prismagraphql/product';
@Injectable()
export class ProductService extends BaseCrudService<
  Product,
  FindFirstProductArgs,
  FindUniqueProductArgs,
  FindManyProductArgs,
  ProductGroupByArgs,
  ProductAggregateArgs,
  CreateOneProductArgs,
  CreateManyProductArgs,
  UpdateOneProductArgs,
  UpdateManyProductArgs,
  DeleteOneProductArgs,
  DeleteManyProductArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
