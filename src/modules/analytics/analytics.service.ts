import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Update per-variant sales stats and customer preferences on consumer sale fulfillment
  async recordConsumerSaleFulfilled(sale: {
    id: string;
    customerId?: string | null;
    items: Array<{ productVariantId: string; quantity: number }>;
  }) {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    for (const it of sale.items) {
      const existing = await this.prisma.productSalesStats.findUnique({
        where: { productVariantId: it.productVariantId },
      });
      const monthly = existing?.monthlySales
        ? (existing.monthlySales as any)
        : {};
      monthly[ym] = (monthly[ym] || 0) + it.quantity;
      await this.prisma.productSalesStats.upsert({
        where: { productVariantId: it.productVariantId },
        update: {
          totalSold: { increment: it.quantity } as any,
          lastSoldAt: now,
          monthlySales: monthly as any,
        },
        create: {
          productVariantId: it.productVariantId,
          totalSold: it.quantity,
          totalReturned: 0,
          lastSoldAt: now,
          monthlySales: { [ym]: it.quantity } as any,
        },
      });
    }

    if (sale.customerId) {
      // Update customer preference profile
      const cpp = await this.prisma.customerPreferenceProfile.findUnique({
        where: { customerId: sale.customerId },
      });
      const freq = cpp?.frequentlyBoughtVariants
        ? (cpp.frequentlyBoughtVariants as any)
        : {};
      for (const it of sale.items) {
        freq[it.productVariantId] =
          (freq[it.productVariantId] || 0) + it.quantity;
      }
      const totalCount: number = (Object.values(freq) as any[]).reduce(
        (s: number, v: any) => s + (typeof v === 'number' ? v : 0),
        0,
      );
      await this.prisma.customerPreferenceProfile.upsert({
        where: { customerId: sale.customerId },
        update: {
          frequentlyBoughtVariants: freq as any,
          lastPurchaseDate: now,
          eligibleForDiscounts: totalCount >= 5,
        },
        create: {
          customerId: sale.customerId,
          frequentlyBoughtVariants: freq as any,
          lastPurchaseDate: now,
          eligibleForDiscounts: totalCount >= 5,
        },
      });
    }
  }

  // Update per-variant returns count when sales return accepted
  async recordSalesReturnAccepted(sr: {
    items: Array<{ productVariantId: string; quantity: number }>;
  }) {
    for (const it of sr.items) {
      const existing = await this.prisma.productSalesStats.findUnique({
        where: { productVariantId: it.productVariantId },
      });
      const base = existing ? 0 : 0;
      await this.prisma.productSalesStats.upsert({
        where: { productVariantId: it.productVariantId },
        update: { totalReturned: { increment: it.quantity } as any },
        create: {
          productVariantId: it.productVariantId,
          totalSold: base,
          totalReturned: it.quantity,
          monthlySales: {} as any,
        },
      });
    }
  }
}

// Read helpers
export interface TopSellingParams { month: string; limit: number }
export interface CustomerAffinityParams { customerId: string; limit: number }
export interface MonthlySummaryParams { month: string }

export interface VariantQty { productVariantId: string; quantity: number }
export interface AffinityEntry { productVariantId: string; count: number }

export class AnalyticsReadService {
  constructor(private prisma: PrismaService) {}

  async topSellingVariants({ month, limit }: TopSellingParams): Promise<VariantQty[]> {
    const stats = await this.prisma.productSalesStats.findMany({ select: { productVariantId: true, monthlySales: true } });
    const list: VariantQty[] = [];
    for (const s of stats) {
      const m = (s.monthlySales as any) || {};
      const qty = Number(m[month] || 0);
      if (qty > 0) list.push({ productVariantId: s.productVariantId, quantity: qty });
    }
    list.sort((a, b) => b.quantity - a.quantity);
    return list.slice(0, limit);
  }

  async customerAffinity({ customerId, limit }: CustomerAffinityParams): Promise<AffinityEntry[]> {
    const cpp = await this.prisma.customerPreferenceProfile.findUnique({ where: { customerId } });
    const freq = (cpp?.frequentlyBoughtVariants as any) || {};
    const entries = Object.entries(freq).map(([productVariantId, count]) => ({ productVariantId, count: Number(count) })) as AffinityEntry[];
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, limit);
  }

  async monthlySalesSummary({ month }: MonthlySummaryParams): Promise<{ month: string; totalSold: number; totalReturned: number }> {
    const stats = await this.prisma.productSalesStats.findMany({ select: { monthlySales: true } });
    let totalSold = 0;
    for (const s of stats) {
      const m = (s.monthlySales as any) || {};
      totalSold += Number(m[month] || 0);
    }
    // Returns for month = sum of SalesReturnItem quantities where parent return is ACCEPTED and createdAt in month
    const [year, mm] = month.split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0));
    const returns = await this.prisma.salesReturn.findMany({
      where: { status: 'ACCEPTED' as any, createdAt: { gte: start, lt: end } },
      select: { items: { select: { quantity: true } } },
    });
    const totalReturned = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0);
    return { month, totalSold, totalReturned };
  }

  private monthWindow(month: string) {
    const [year, mm] = month.split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0));
    return { start, end };
  }

  async topSellingVariantsDetailed({ month, limit }: TopSellingParams): Promise<VariantQty[]> {
    const basic = await this.topSellingVariants({ month, limit });
    return basic;
  }

  async topSellingVariantsByStore(params: { storeId: string; month: string; limit: number }): Promise<VariantQty[]> {
    const { storeId, month, limit } = params;
    const { start, end } = this.monthWindow(month);
    const map = new Map<string, number>();
    // Consumer sales
    const cSales = await this.prisma.consumerSale.findMany({
      where: { storeId, createdAt: { gte: start, lt: end } },
      select: { items: { select: { productVariantId: true, quantity: true } } },
    });
    for (const s of cSales) {
      for (const it of s.items) {
        map.set(it.productVariantId, (map.get(it.productVariantId) || 0) + it.quantity);
      }
    }
    // Reseller sales
    const rSales = await this.prisma.resellerSale.findMany({
      where: { storeId, createdAt: { gte: start, lt: end } },
      select: { items: { select: { productVariantId: true, quantity: true } } },
    });
    for (const s of rSales) {
      for (const it of s.items) {
        map.set(it.productVariantId, (map.get(it.productVariantId) || 0) + it.quantity);
      }
    }
    const arr: VariantQty[] = Array.from(map.entries()).map(([productVariantId, quantity]) => ({ productVariantId, quantity }));
    arr.sort((a, b) => b.quantity - a.quantity);
    return arr.slice(0, limit);
  }

  async monthlySalesSummaryByStore(params: { storeId: string; month: string }): Promise<{ month: string; totalSold: number; totalReturned: number }> {
    const { storeId, month } = params;
    const { start, end } = this.monthWindow(month);
    // Sold
    let totalSold = 0;
    const cSales = await this.prisma.consumerSale.findMany({ where: { storeId, createdAt: { gte: start, lt: end } }, select: { items: { select: { quantity: true } } } });
    for (const s of cSales) totalSold += s.items.reduce((sum, it) => sum + it.quantity, 0);
    const rSales = await this.prisma.resellerSale.findMany({ where: { storeId, createdAt: { gte: start, lt: end } }, select: { items: { select: { quantity: true } } } });
    for (const s of rSales) totalSold += s.items.reduce((sum, it) => sum + it.quantity, 0);
    // Returned
    const returns = await this.prisma.salesReturn.findMany({ where: { storeId, status: 'ACCEPTED' as any, createdAt: { gte: start, lt: end } }, select: { items: { select: { quantity: true } } } });
    const totalReturned = returns.reduce((sum, r) => sum + r.items.reduce((s, it) => s + it.quantity, 0), 0);
    return { month, totalSold, totalReturned };
  }

  async enrichVariantDetails(list: VariantQty[]): Promise<Array<VariantQty & { productId?: string | null; productName?: string | null; size?: string | null; concentration?: string | null; packaging?: string | null; barcode?: string | null }>> {
    const ids = list.map((v) => v.productVariantId);
    if (!ids.length) return [] as any;
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: { id: true, size: true, concentration: true, packaging: true, barcode: true, product: { select: { id: true, name: true } } },
    });
    const map = new Map(variants.map((v) => [v.id, v] as const));
    return list.map((e) => {
      const v = map.get(e.productVariantId);
      return {
        ...e,
        productId: v?.product?.id ?? null,
        productName: v?.product?.name ?? null,
        size: v?.size ?? null,
        concentration: v?.concentration ?? null,
        packaging: v?.packaging ?? null,
        barcode: v?.barcode ?? null,
      } as any;
    });
  }
}
