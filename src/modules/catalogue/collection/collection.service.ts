import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type FacetFilter = { facetId: string; value: string };

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.collection.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async byId(id: string) {
    const row = await this.prisma.collection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  }

  async create(input: {
    name: string;
    code: string;
    target: 'PRODUCT' | 'VARIANT';
    filters: FacetFilter[];
  }) {
    return this.prisma.collection.create({
      data: {
        name: input.name,
        code: input.code,
        target: input.target,
        filters: input.filters as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(input: {
    id: string;
    name?: string;
    code?: string;
    filters?: FacetFilter[];
  }) {
    return this.prisma.collection.update({
      where: { id: input.id },
      data: {
        name: input.name,
        code: input.code,
        filters: input.filters
          ? (input.filters as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.collection.delete({ where: { id } });
    return true;
  }

  private buildWhereForFilters(
    target: 'PRODUCT' | 'VARIANT',
    filters: FacetFilter[],
  ) {
    const AND: any[] = [];
    for (const f of filters || []) {
      if (!f?.facetId || !f?.value) continue;
      if (target === 'VARIANT') {
        AND.push({ facets: { some: { facetId: f.facetId, value: f.value } } });
      } else {
        AND.push({ facets: { some: { facetId: f.facetId, value: f.value } } });
      }
    }
    const where: Record<string, unknown> = {};
    if (AND.length) where.AND = AND;
    return where;
  }

  async membersCount(collectionId: string) {
    const col = await this.byId(collectionId);
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters(col.target, filters);
    if (col.target === 'VARIANT')
      return this.prisma.productVariant.count({
        where: where as Prisma.ProductVariantWhereInput,
      });
    return this.prisma.product.count({
      where: where as Prisma.ProductWhereInput,
    });
  }

  async variantMembers(collectionId: string, take?: number, skip?: number) {
    const col = await this.byId(collectionId);
    if (col.target !== 'VARIANT') return [];
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters('VARIANT', filters);
    return this.prisma.productVariant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take ?? undefined,
      skip: skip ?? undefined,
    });
  }

  async productMembers(collectionId: string, take?: number, skip?: number) {
    const col = await this.byId(collectionId);
    if (col.target !== 'PRODUCT') return [];
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters('PRODUCT', filters);
    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take ?? undefined,
      skip: skip ?? undefined,
    });
  }
}
