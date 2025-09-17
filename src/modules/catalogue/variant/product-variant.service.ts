import { Injectable } from '@nestjs/common';
import { Prisma, UserTier } from '@prisma/client';
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
import { LooseProductVariantInput } from '../dto/loose-product-variant.input';

type VariantWithDetails = Prisma.ProductVariantGetPayload<{
  include: { product: true; stockItems: true };
}>;

type SupplierCatalogEntry = Prisma.SupplierCatalogGetPayload<{
  select: {
    supplierId: true;
    productVariantId: true;
    defaultCost: true;
    leadTimeDays: true;
    isPreferred: true;
  };
}>;

type VariantTierPriceEntry = Prisma.ProductVariantTierPriceGetPayload<{
  select: { productVariantId: true; tier: true; price: true };
}>;
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

  async variantsByStore(
    storeId: string,
    search?: string,
  ): Promise<VariantWithDetails[]> {
    const where: Prisma.ProductVariantWhereInput = {};
    if (search) {
      const containsFilter = { contains: search, mode: 'insensitive' as const };
      where.OR = [
        { product: { name: containsFilter } },
        { size: containsFilter },
        { concentration: containsFilter },
        { packaging: containsFilter },
        { barcode: containsFilter },
      ];
    }
    const variants = await this.prisma.productVariant.findMany({
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

  async lowStockByStore(storeId: string): Promise<VariantWithDetails[]> {
    const stocks = await this.prisma.stock.findMany({
      where: { storeId, reorderPoint: { not: null } },
      select: {
        productVariantId: true,
        quantity: true,
        reserved: true,
        reorderPoint: true,
      },
    });
    const variantIds: string[] = [];
    for (const s of stocks) {
      const available = (s.quantity || 0) - (s.reserved || 0);
      if ((s.reorderPoint ?? 0) > 0 && available < (s.reorderPoint ?? 0)) {
        variantIds.push(s.productVariantId);
      }
    }
    if (!variantIds.length) return [];
    return this.prisma.productVariant.findMany({
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
  }): Promise<SupplierCatalogEntry> {
    return this.prisma.supplierCatalog.upsert({
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

  async suppliersForVariant(
    productVariantId: string,
  ): Promise<SupplierCatalogEntry[]> {
    return this.prisma.supplierCatalog.findMany({
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

  async upsertVariantTierPrice(input: {
    productVariantId: string;
    tier: UserTier;
    price: number;
  }): Promise<VariantTierPriceEntry> {
    return this.prisma.productVariantTierPrice.upsert({
      where: {
        productVariantId_tier: {
          productVariantId: input.productVariantId,
          tier: input.tier,
        },
      },
      update: { price: input.price },
      create: {
        productVariantId: input.productVariantId,
        tier: input.tier,
        price: input.price,
      },
      select: { productVariantId: true, tier: true, price: true },
    });
  }

  async tierPricesForVariant(
    productVariantId: string,
  ): Promise<VariantTierPriceEntry[]> {
    return this.prisma.productVariantTierPrice.findMany({
      where: { productVariantId },
      select: { productVariantId: true, tier: true, price: true },
      orderBy: { tier: 'asc' },
    });
  }

  async createLoose(
    input: LooseProductVariantInput,
  ): Promise<VariantWithDetails> {
    return this.prisma.productVariant.create({
      data: {
        productId: input.productId ?? null,
        name: input.name ?? null,
        size: input.size,
        concentration: input.concentration,
        packaging: input.packaging,
        barcode: input.barcode ?? null,
        price: input.price,
        resellerPrice: input.resellerPrice,
      },
      include: {
        product: true,
        stockItems: true,
      },
    });
  }

  async linkToProduct(
    variantId: string,
    productId: string,
  ): Promise<VariantWithDetails> {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { productId },
      include: {
        product: true,
        stockItems: true,
      },
    });
  }

  async unlinkFromProduct(variantId: string): Promise<VariantWithDetails> {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { productId: null },
      include: {
        product: true,
        stockItems: true,
      },
    });
  }

  async count(where?: Prisma.ProductVariantWhereInput): Promise<number> {
    return this.prisma.productVariant.count({ where });
  }
}
