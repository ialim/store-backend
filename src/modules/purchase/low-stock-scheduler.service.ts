import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { DomainEventsService } from '../events/services/domain-events.service';

@Injectable()
export class LowStockSchedulerService {
  private readonly logger = new Logger(LowStockSchedulerService.name);
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

  // Run hourly to create requisitions for low stock items
  @Interval(60 * 60 * 1000)
  async handleInterval() {
    // Find variants with reorder settings and quantity <= reorderPoint
    const candidates = await this.prisma.stock.findMany({
      where: { reorderPoint: { not: null }, reorderQty: { not: null } },
      select: { storeId: true, productVariantId: true, reorderQty: true, reorderPoint: true, quantity: true },
      take: 2000,
    });
    const lows = candidates.filter((s) => (s.reorderPoint ?? 0) > 0 && (s.quantity ?? 0) <= (s.reorderPoint ?? 0));
    if (!lows.length) return;

    // Group by store
    const byStore = new Map<string, Array<{ productVariantId: string; qty: number }>>();
    for (const s of lows) {
      const list = byStore.get(s.storeId) || [];
      list.push({ productVariantId: s.productVariantId, qty: s.reorderQty ?? 0 });
      byStore.set(s.storeId, list);
    }

    for (const [storeId, items] of byStore.entries()) {
      // Skip if a draft requisition exists recently to avoid spam
      const recent = await this.prisma.purchaseRequisition.findFirst({
        where: { storeId, status: 'DRAFT' as any, createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } as any },
        select: { id: true },
      });
      if (recent) continue;

      const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { managerId: true, name: true } });
      const requestedById = store?.managerId || items[0]?.productVariantId; // fallback placeholder
      const req = await this.prisma.purchaseRequisition.create({
        data: {
          storeId,
          requestedById,
          status: 'DRAFT' as any,
          items: {
            create: items.map((i) => ({ productVariantId: i.productVariantId, requestedQty: i.qty || 1 })),
          },
        },
      });
      await this.domainEvents.publish(
        'PURCHASE_REQUISITION_CREATED',
        { requisitionId: req.id, reason: 'AUTO_LOW_STOCK', storeId },
        { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
      );
      if (store?.managerId) {
        await this.notifications.createNotification(
          store.managerId,
          'LOW_STOCK_REQUISITION_CREATED',
          `Auto-created requisition ${req.id} for low stock at store ${store.name}.`,
        );
      }
      this.logger.log(`Created low-stock requisition ${req.id} for store ${storeId}`);
    }
  }
}
