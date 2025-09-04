import { Module } from '@nestjs/common';
import { ProductService } from './product/product.service';
import { ProductsResolver } from './product/product.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductCategoryService } from './category/product-category.service';
import { ProductCategorysResolver } from './category/product-category.resolver';
import { ProductVariantService } from './variant/product-variant.service';
import { ProductVariantsResolver } from './variant/product-variant.resolver';

@Module({
  providers: [
    ProductService,
    ProductsResolver,
    PrismaService,
    ProductCategorysResolver,
    ProductCategoryService,
    ProductVariantsResolver,
    ProductVariantService,
  ],
})
export class CatalogueModule {}
