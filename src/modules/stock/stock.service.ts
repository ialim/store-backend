// src/stock/stock.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReceiveStockBatchInput } from './dto/receive-stock-batch.input';
import { TransferStockInput } from './dto/transfer-stock.input';
import { MovementDirection } from '../../shared/prismagraphql/prisma/movement-direction.enum';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Query current stock levels
  async queryStock(storeId?: string, productVariantId?: string) {
    return this.prisma.stock.findMany({
      where: {
        storeId: storeId ?? undefined,
        productVariantId: productVariantId ?? undefined,
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

  // Helper to apply stock changes after creating a movement record
  private async applyStockMovement(
    direction: MovementDirection,
    storeId: string,
    items: { productVariantId: string; quantity: number }[],
  ) {
    for (const { productVariantId, quantity } of items) {
      await this.prisma.stock.upsert({
        where: {
          id: undefined,
          // composite unique constraint: (storeId, productVariantId)
          AND: [
            {
              storeId,
              productVariantId,
            },
          ],
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
}
