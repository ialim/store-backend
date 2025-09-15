import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type FacetFilter = { facetId: string; value: string };

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return (this.prisma as any).collection.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async byId(id: string) {
    const row = await (this.prisma as any).collection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  }

  async create(input: { name: string; code: string; target: 'PRODUCT' | 'VARIANT'; filters: FacetFilter[] }) {
    return (this.prisma as any).collection.create({ data: { name: input.name, code: input.code, target: input.target, filters: input.filters } });
  }

  async update(input: { id: string; name?: string; code?: string; filters?: FacetFilter[] }) {
    return (this.prisma as any).collection.update({ where: { id: input.id }, data: { name: input.name, code: input.code, filters: input.filters as any } });
  }

  async delete(id: string) {
    await (this.prisma as any).collection.delete({ where: { id } });
    return true;
  }

  private buildWhereForFilters(target: 'PRODUCT' | 'VARIANT', filters: FacetFilter[]) {
    const AND: any[] = [];
    for (const f of filters || []) {
      if (!f?.facetId || !f?.value) continue;
      if (target === 'VARIANT') {
        AND.push({ facets: { some: { facetId: f.facetId, value: f.value } } });
      } else {
        AND.push({ facets: { some: { facetId: f.facetId, value: f.value } } });
      }
    }
    const where: any = {};
    if (AND.length) where.AND = AND;
    return where;
  }

  async membersCount(collectionId: string) {
    const col = await this.byId(collectionId);
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters(col.target, filters);
    if (col.target === 'VARIANT') return (this.prisma as any).productVariant.count({ where });
    return (this.prisma as any).product.count({ where });
  }

  async variantMembers(collectionId: string, take?: number, skip?: number) {
    const col = await this.byId(collectionId);
    if (col.target !== 'VARIANT') return [];
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters('VARIANT', filters);
    return (this.prisma as any).productVariant.findMany({ where, orderBy: { createdAt: 'desc' }, take: take ?? undefined, skip: skip ?? undefined });
  }

  async productMembers(collectionId: string, take?: number, skip?: number) {
    const col = await this.byId(collectionId);
    if (col.target !== 'PRODUCT') return [];
    const filters = (col.filters || []) as FacetFilter[];
    const where = this.buildWhereForFilters('PRODUCT', filters);
    return (this.prisma as any).product.findMany({ where, orderBy: { createdAt: 'desc' }, take: take ?? undefined, skip: skip ?? undefined });
  }
}

