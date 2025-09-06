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
