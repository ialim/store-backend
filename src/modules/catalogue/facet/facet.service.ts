import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

type ProductFacetAssignment = Prisma.ProductFacetValueGetPayload<{
  include: { facet: true };
}>;

type VariantFacetAssignment = Prisma.VariantFacetValueGetPayload<{
  include: { facet: true };
}>;

@Injectable()
export class FacetService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.facet.findMany({ orderBy: { name: 'asc' } });
  }

  create(input: {
    name: string;
    code: string;
    isPrivate?: boolean;
    values: string[];
  }) {
    return this.prisma.facet.create({
      data: {
        name: input.name,
        code: input.code,
        isPrivate: !!input.isPrivate,
        values: input.values,
      },
    });
  }

  update(
    id: string,
    patch: Partial<{ name: string; isPrivate: boolean; values: string[] }>,
  ) {
    return this.prisma.facet.update({ where: { id }, data: patch });
  }

  delete(id: string) {
    return this.prisma.facet.delete({ where: { id } });
  }

  assignToProduct(productId: string, facetId: string, value: string) {
    return this.prisma.productFacetValue.upsert({
      where: { product_facet_value_unique: { productId, facetId, value } },
      update: {},
      create: { productId, facetId, value },
    });
  }

  removeFromProduct(productId: string, facetId: string, value: string) {
    return this.prisma.productFacetValue.delete({
      where: { product_facet_value_unique: { productId, facetId, value } },
    });
  }

  assignToVariant(productVariantId: string, facetId: string, value: string) {
    return this.prisma.variantFacetValue.upsert({
      where: {
        variant_facet_value_unique: { productVariantId, facetId, value },
      },
      update: {},
      create: { productVariantId, facetId, value },
    });
  }

  removeFromVariant(productVariantId: string, facetId: string, value: string) {
    return this.prisma.variantFacetValue.delete({
      where: {
        variant_facet_value_unique: { productVariantId, facetId, value },
      },
    });
  }

  async listProductAssignments(
    productId: string,
  ): Promise<ProductFacetAssignment[]> {
    return this.prisma.productFacetValue.findMany({
      where: { productId },
      include: { facet: true },
    });
  }

  async listVariantAssignments(
    productVariantId: string,
  ): Promise<VariantFacetAssignment[]> {
    return this.prisma.variantFacetValue.findMany({
      where: { productVariantId },
      include: { facet: true },
    });
  }

  async bulkAssignToVariants(
    variantIds: string[],
    facetId: string,
    value: string,
  ) {
    let count = 0;
    for (const id of variantIds) {
      await this.prisma.variantFacetValue.upsert({
        where: {
          variant_facet_value_unique: { productVariantId: id, facetId, value },
        },
        update: {},
        create: { productVariantId: id, facetId, value },
      });
      count++;
    }
    return count;
  }

  async bulkAssignToProducts(
    productIds: string[],
    facetId: string,
    value: string,
  ) {
    let count = 0;
    for (const id of productIds) {
      await this.prisma.productFacetValue.upsert({
        where: {
          product_facet_value_unique: { productId: id, facetId, value },
        },
        update: {},
        create: { productId: id, facetId, value },
      });
      count++;
    }
    return count;
  }

  async bulkRemoveFromVariants(
    variantIds: string[],
    facetId: string,
    value: string,
  ) {
    let removed = 0;
    for (const id of variantIds) {
      const res = await this.prisma.variantFacetValue.deleteMany({
        where: { productVariantId: id, facetId, value },
      });
      removed += res.count || 0;
    }
    return removed;
  }

  async bulkRemoveFromProducts(
    productIds: string[],
    facetId: string,
    value: string,
  ) {
    let removed = 0;
    for (const id of productIds) {
      const res = await this.prisma.productFacetValue.deleteMany({
        where: { productId: id, facetId, value },
      });
      removed += res.count || 0;
    }
    return removed;
  }
}
