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
}
