import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class FacetService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return (this.prisma as any).facet.findMany({ orderBy: { name: 'asc' } });
  }

  create(input: { name: string; code: string; isPrivate?: boolean; values: string[] }) {
    return (this.prisma as any).facet.create({ data: { name: input.name, code: input.code, isPrivate: !!input.isPrivate, values: input.values } });
  }

  update(id: string, patch: Partial<{ name: string; isPrivate: boolean; values: string[] }>) {
    return (this.prisma as any).facet.update({ where: { id }, data: patch });
  }

  delete(id: string) {
    return (this.prisma as any).facet.delete({ where: { id } });
  }

  assignToProduct(productId: string, facetId: string, value: string) {
    return (this.prisma as any).productFacetValue.upsert({
      where: { product_facet_value_unique: { productId, facetId, value } },
      update: {},
      create: { productId, facetId, value },
    });
  }

  removeFromProduct(productId: string, facetId: string, value: string) {
    return (this.prisma as any).productFacetValue.delete({ where: { product_facet_value_unique: { productId, facetId, value } } });
  }

  assignToVariant(productVariantId: string, facetId: string, value: string) {
    return (this.prisma as any).variantFacetValue.upsert({
      where: { variant_facet_value_unique: { productVariantId, facetId, value } },
      update: {},
      create: { productVariantId, facetId, value },
    });
  }

  removeFromVariant(productVariantId: string, facetId: string, value: string) {
    return (this.prisma as any).variantFacetValue.delete({ where: { variant_facet_value_unique: { productVariantId, facetId, value } } });
  }

  async listProductAssignments(productId: string) {
    return (this.prisma as any).productFacetValue.findMany({ where: { productId }, include: { facet: true } });
  }

  async listVariantAssignments(productVariantId: string) {
    return (this.prisma as any).variantFacetValue.findMany({ where: { productVariantId }, include: { facet: true } });
  }
}
