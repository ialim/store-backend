import { Module } from '@nestjs/common';
import { ProductService } from './product/product.service';
import { ProductsResolver } from './product/product.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CatalogueDiagnosticsResolver } from './catalogue.diagnostics.resolver';
import { ProductVariantService } from './variant/product-variant.service';
import { ProductVariantsResolver } from './variant/product-variant.resolver';
import { FacetResolver } from './facet/facet.resolver';
import { FacetService } from './facet/facet.service';
import { CollectionResolver } from './collection/collection.resolver';
import { CollectionService } from './collection/collection.service';
import { VariantImportService } from './variant/variant-import.service';
import { VariantImportController } from './variant/variant-import.controller';

@Module({
  providers: [
    ProductService,
    ProductsResolver,
    PrismaService,
    ProductVariantsResolver,
    ProductVariantService,
    VariantImportService,
    CatalogueDiagnosticsResolver,
    FacetResolver,
    FacetService,
    CollectionResolver,
    CollectionService,
  ],
  controllers: [VariantImportController],
  exports: [ProductVariantService],
})
export class CatalogueModule {}
