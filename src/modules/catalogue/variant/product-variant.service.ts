import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BaseCrudService } from '../../base.services';
import {
  CreateManyProductVariantArgs,
  CreateOneProductVariantArgs,
  DeleteManyProductVariantArgs,
  DeleteOneProductVariantArgs,
  FindFirstProductVariantArgs,
  FindManyProductVariantArgs,
  FindUniqueProductVariantArgs,
  UpdateManyProductVariantArgs,
  UpdateOneProductVariantArgs,
  ProductVariant,
  ProductVariantAggregateArgs,
  ProductVariantGroupByArgs,
} from '../../../shared/prismagraphql/product-variant';
@Injectable()
export class ProductVariantService extends BaseCrudService<
  ProductVariant,
  FindFirstProductVariantArgs,
  FindUniqueProductVariantArgs,
  FindManyProductVariantArgs,
  ProductVariantGroupByArgs,
  ProductVariantAggregateArgs,
  CreateOneProductVariantArgs,
  CreateManyProductVariantArgs,
  UpdateOneProductVariantArgs,
  UpdateManyProductVariantArgs,
  DeleteOneProductVariantArgs,
  DeleteManyProductVariantArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
