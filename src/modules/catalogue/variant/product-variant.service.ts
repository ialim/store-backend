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
}
