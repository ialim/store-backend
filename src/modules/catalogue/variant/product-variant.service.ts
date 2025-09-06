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


  async variantsByStore(storeId: string, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { size: { contains: search, mode: 'insensitive' } },
        { concentration: { contains: search, mode: 'insensitive' } },
        { packaging: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const variants = await (this.prisma as any).productVariant.findMany({
      where,
      include: {
        product: true,
        stockItems: { where: { storeId } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return variants;
  }

  async lowStockByStore(storeId: string) {
    const stocks = await (this.prisma as any).stock.findMany({
      where: { storeId, reorderPoint: { not: null } },
      select: { productVariantId: true, quantity: true, reserved: true, reorderPoint: true },
    });
    const variantIds: string[] = [];
    for (const s of stocks) {
      const available = (s.quantity || 0) - (s.reserved || 0);
      if ((s.reorderPoint ?? 0) > 0 && available < (s.reorderPoint ?? 0)) {
        variantIds.push(s.productVariantId);
      }
    }
    if (!variantIds.length) return [];
    return (this.prisma as any).productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true, stockItems: { where: { storeId } } },
    });
  }


  async upsertVariantSupplierCatalog(input: {
    productVariantId: string;
    supplierId: string;
    defaultCost: number;
    leadTimeDays?: number;
    isPreferred?: boolean;
  }) {
    return (this.prisma as any).supplierCatalog.upsert({
      where: {
        supplierId_productVariantId: {
          supplierId: input.supplierId,
          productVariantId: input.productVariantId,
        },
      },
      update: {
        defaultCost: input.defaultCost,
        leadTimeDays: input.leadTimeDays ?? null,
        isPreferred: input.isPreferred ?? undefined,
      },
      create: {
        supplierId: input.supplierId,
        productVariantId: input.productVariantId,
        defaultCost: input.defaultCost,
        leadTimeDays: input.leadTimeDays ?? null,
        isPreferred: input.isPreferred ?? false,
      },
      select: {
        supplierId: true,
        productVariantId: true,
        defaultCost: true,
        leadTimeDays: true,
        isPreferred: true,
      },
    });
  }

  async suppliersForVariant(productVariantId: string) {
    return (this.prisma as any).supplierCatalog.findMany({
      where: { productVariantId },
      select: {
        supplierId: true,
        productVariantId: true,
        defaultCost: true,
        leadTimeDays: true,
        isPreferred: true,
      },
      orderBy: { defaultCost: 'asc' },
    });
  }
}
