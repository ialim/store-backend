// src/stock/stock.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReceiveStockBatchInput } from './dto/receive-stock-batch.input';
import { TransferStockInput } from './dto/transfer-stock.input';
import { MovementDirection } from '../../shared/prismagraphql/prisma/movement-direction.enum';
import { NotificationService } from '../notification/notification.service';
import { SetReorderSettingsInput } from './dto/set-reorder-settings.input';
import { DomainEventsService } from '../events/services/domain-events.service';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

  // Query current stock levels
  async queryStock(storeId?: string, productVariantId?: string) {
    return this.prisma.stock.findMany({
      where: {
        storeId: storeId ?? undefined,
        productVariantId: productVariantId ?? undefined,
      },
      include: {
        store: { select: { id: true, name: true } },
        productVariant: {
          select: {
            id: true,
            size: true,
            concentration: true,
            packaging: true,
            barcode: true,
            product: { select: { name: true } },
          },
        },
      },
    });
  }

  // List all movements for a store
  async listMovements(storeId: string) {
    return this.prisma.stockMovement.findMany({
      where: { storeId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async stockTotalsByProduct(productId: string) {
    const rows = await this.prisma.stock.findMany({
      where: { productVariant: { productId } },
      select: { productVariantId: true, quantity: true, reserved: true },
    });
    const totals = new Map<string, { onHand: number; reserved: number }>();
    for (const r of rows) {
      const t = totals.get(r.productVariantId) || { onHand: 0, reserved: 0 };
      t.onHand += r.quantity || 0;
      t.reserved += r.reserved || 0;
      totals.set(r.productVariantId, t);
    }
    return Array.from(totals.entries()).map(([variantId, t]) => ({
      variantId,
      onHand: t.onHand,
      reserved: t.reserved,
      available: t.onHand - t.reserved,
    }));
  }

  async stockTotalsByProductStore(productId: string, storeId: string) {
    const rows = await this.prisma.stock.findMany({
      where: { productVariant: { productId }, storeId },
      select: { productVariantId: true, quantity: true, reserved: true },
    });
    const totals = new Map<string, { onHand: number; reserved: number }>();
    for (const r of rows) {
      const t = totals.get(r.productVariantId) || { onHand: 0, reserved: 0 };
      t.onHand += r.quantity || 0;
      t.reserved += r.reserved || 0;
      totals.set(r.productVariantId, t);
    }
    return Array.from(totals.entries()).map(([variantId, t]) => ({
      variantId,
      onHand: t.onHand,
      reserved: t.reserved,
      available: t.onHand - t.reserved,
    }));
  }

  // Helper to apply stock changes after creating a movement record
  private async applyStockMovement(
    direction: MovementDirection,
    storeId: string,
    items: { productVariantId: string; quantity: number }[],
  ) {
    for (const { productVariantId, quantity } of items) {
      await this.prisma.stock.upsert({
        where: {
          storeId_productVariantId: { storeId, productVariantId },
        },
        update: {
          quantity:
            direction === MovementDirection.IN
              ? { increment: quantity }
              : { decrement: quantity },
        },
        create: {
          storeId,
          productVariantId,
          quantity: direction === MovementDirection.IN ? quantity : -quantity,
          reserved: 0,
        },
      });
    }
  }

  private async notifyAdminsAndManagers(message: string) {
    // find all users with role ADMIN or MANAGER
    const recipients = await this.prisma.user.findMany({
      where: { role: { name: { in: ['ADMIN', 'MANAGER'] } } },
      select: { id: true },
    });

    // create a notification for each
    await Promise.all(
      recipients.map((u) =>
        this.notificationService.createNotification(
          u.id,
          'STOCK_MOVEMENT',
          message,
        ),
      ),
    );
  }

  // Receive a batch (Purchase IN)
  async receiveStockBatch(input: ReceiveStockBatchInput) {
    return this.prisma.$transaction(async (tx) => {
      // Validate over-receipt against PO lines
      const po = await tx.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: { items: true },
      });
      if (po) {
        // Aggregate incoming quantities by variant
        const incoming = new Map<string, number>();
        for (const it of input.items) {
          incoming.set(
            it.productVariantId,
            (incoming.get(it.productVariantId) || 0) + it.quantity,
          );
        }
        // Sum already received across previous batches
        const priorBatches = await tx.stockReceiptBatch.findMany({
          where: { purchaseOrderId: input.purchaseOrderId },
          select: { id: true },
        });
        const priorIds = priorBatches.map((b) => b.id);
        const priorItems = priorIds.length
          ? await tx.stockReceiptBatchItem.findMany({
              where: { stockReceiptBatchId: { in: priorIds } },
              select: { productVariantId: true, quantity: true },
            })
          : [];
        const receivedSoFar = new Map<string, number>();
        for (const it of priorItems) {
          receivedSoFar.set(
            it.productVariantId,
            (receivedSoFar.get(it.productVariantId) || 0) + it.quantity,
          );
        }
        for (const line of po.items) {
          const got = receivedSoFar.get(line.productVariantId) || 0;
          const inc = incoming.get(line.productVariantId) || 0;
          if (got + inc > line.quantity) {
            throw new BadRequestException(
              `Over-receipt for variant ${line.productVariantId}: ${got}+${inc} > ordered ${line.quantity}`,
            );
          }
        }
      }
      const batch = await tx.stockReceiptBatch.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          storeId: input.storeId,
          receivedById: input.receivedById,
          confirmedById: input.confirmedById,
          waybillUrl: input.waybillUrl,
          items: {
            create: input.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      const movement = await tx.stockMovement.create({
        data: {
          storeId: batch.storeId,
          direction: MovementDirection.IN,
          movementType: 'PURCHASE',
          referenceEntity: 'StockReceiptBatch',
          referenceId: batch.id,
          items: {
            create: batch.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Apply to stock
      await this.applyStockMovement(
        MovementDirection.IN,
        movement.storeId,
        movement.items.map((i) => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })),
      );

      await this.notifyAdminsAndManagers(
        `Received ${movement.items.reduce((sum, i) => sum + i.quantity, 0)} units via PURCHASE at store ${movement.storeId}`,
      );

      // Auto-update related Purchase Order receiving progress
      try {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: { items: true },
        });
        if (po) {
          // All batches for this PO
          const batches = await tx.stockReceiptBatch.findMany({
            where: { purchaseOrderId: input.purchaseOrderId },
            select: { id: true },
          });
          const batchIds = batches.map((b) => b.id);
          const receiptItems = await tx.stockReceiptBatchItem.findMany({
            where: { stockReceiptBatchId: { in: batchIds } },
            select: { productVariantId: true, quantity: true },
          });
          const receivedMap = new Map<string, number>();
          for (const ri of receiptItems) {
            receivedMap.set(
              ri.productVariantId,
              (receivedMap.get(ri.productVariantId) || 0) + ri.quantity,
            );
          }
          const fullyReceived = po.items.every(
            (it) => (receivedMap.get(it.productVariantId) || 0) >= it.quantity,
          );

          // Set phase to RECEIVING on first receipt
          if (po.phase !== ('RECEIVING' as any)) {
            await tx.purchaseOrder.update({
              where: { id: po.id },
              data: { phase: 'RECEIVING' as any },
            });
          }

          if (fullyReceived && po.status !== ('RECEIVED' as any)) {
            await tx.purchaseOrder.update({
              where: { id: po.id },
              data: { status: 'RECEIVED' as any },
            });
            await this.domainEvents.publish(
              'PURCHASE_ORDER_RECEIVED',
              { purchaseOrderId: po.id },
              { aggregateType: 'PurchaseOrder', aggregateId: po.id },
            );

            // If paid as well, mark completed
            const paidAgg = await tx.supplierPayment.aggregate({
              _sum: { amount: true },
              where: { purchaseOrderId: po.id },
            });
            const paid = paidAgg._sum.amount || 0;
            if (paid >= po.totalAmount) {
              await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { phase: 'COMPLETED' as any },
              });
              await this.domainEvents.publish(
                'PURCHASE_COMPLETED',
                { purchaseOrderId: po.id },
                { aggregateType: 'PurchaseOrder', aggregateId: po.id },
              );
              try {
                const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId }, select: { userId: true } });
                if (supplier?.userId) {
                  await this.notificationService.createNotification(
                    supplier.userId,
                    'PURCHASE_COMPLETED',
                    `PO ${po.invoiceNumber} completed.`,
                  );
                }
              } catch {}
            }
          }
        }
      } catch (e) {
        // Non-fatal; just log to console for now
        // eslint-disable-next-line no-console
        console.error('Failed to auto-update PO on receipt:', e);
      }

      return batch;
    });
  }

  // Transfer stock between stores
  async transferStock(input: TransferStockInput) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          fromStoreId: input.fromStoreId,
          toStoreId: input.toStoreId,
          requestedById: input.requestedById,
          approvedById: input.approvedById,
          status: 'COMPLETED',
          items: {
            create: input.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // OUT movement for fromStore
      const outMovement = await tx.stockMovement.create({
        data: {
          storeId: transfer.fromStoreId,
          direction: MovementDirection.OUT,
          movementType: 'TRANSFER',
          referenceEntity: 'StockTransfer',
          referenceId: transfer.id,
          items: {
            create: transfer.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // IN movement for toStore
      const inMovement = await tx.stockMovement.create({
        data: {
          storeId: transfer.toStoreId,
          direction: MovementDirection.IN,
          movementType: 'TRANSFER',
          referenceEntity: 'StockTransfer',
          referenceId: transfer.id,
          items: {
            create: transfer.items.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Apply both movements
      await this.applyStockMovement(
        MovementDirection.OUT,
        outMovement.storeId,
        outMovement.items.map((i) => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })),
      );
      await this.applyStockMovement(
        MovementDirection.IN,
        inMovement.storeId,
        inMovement.items.map((i) => ({
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })),
      );

      const total = transfer.items.reduce((sum, i) => sum + i.quantity, 0);
      await this.notifyAdminsAndManagers(
        `Transferred ${total} units from store ${transfer.fromStoreId} to ${transfer.toStoreId}`,
      );

      return transfer;
    });
  }

  // Set or clear reorder settings for a store's variant
  async setReorderSettings(input: SetReorderSettingsInput) {
    const existing = await this.prisma.stock.findFirst({
      where: {
        storeId: input.storeId,
        productVariantId: input.productVariantId,
      },
    });
    if (existing) {
      return this.prisma.stock.update({
        where: { id: existing.id },
        data: {
          reorderPoint: input.reorderPoint ?? null,
          reorderQty: input.reorderQty ?? null,
        },
      });
    }
    // Create entry with zero quantity but reorder settings
    return this.prisma.stock.create({
      data: {
        storeId: input.storeId,
        productVariantId: input.productVariantId,
        quantity: 0,
        reserved: 0,
        reorderPoint: input.reorderPoint ?? null,
        reorderQty: input.reorderQty ?? null,
      },
    });
  }
}
