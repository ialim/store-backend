import { Module } from '@nestjs/common';
import { ProductService } from './product/product.service';
import { ProductsResolver } from './product/product.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CatalogueDiagnosticsResolver } from './catalogue.diagnostics.resolver';
import { ProductVariantService } from './variant/product-variant.service';
import { ProductVariantsResolver } from './variant/product-variant.resolver';
import { FacetResolver } from './facet/facet.resolver';
import { FacetService } from './facet/facet.service';

@Module({
  providers: [
    ProductService,
    ProductsResolver,
    PrismaService,
    ProductVariantsResolver,
    ProductVariantService,
    CatalogueDiagnosticsResolver,
    FacetResolver,
    FacetService,
  ],
  exports: [ProductVariantService],
})
export class CatalogueModule {}
