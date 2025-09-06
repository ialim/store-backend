import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { DomainEventsService } from '../events/services/domain-events.service';
import { CreateSalesReturnInput } from './dto/create-sales-return.input';
import { UpdateSalesReturnStatusInput } from './dto/update-sales-return-status.input';
import { CreatePurchaseReturnInput } from './dto/create-purchase-return.input';
import { FulfillPurchaseReturnInput } from './dto/fulfill-purchase-return.input';
import { MovementDirection } from '../../shared/prismagraphql/prisma/movement-direction.enum';
import { CreateOrderReturnInput } from './dto/create-order-return.input';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

  // Helper: notify admins/managers
  private async notifyAdminsManagers(type: string, message: string) {
    const recipients = await this.prisma.user.findMany({
      where: { role: { name: { in: ['ADMIN', 'MANAGER'] } } },
      select: { id: true },
    });
    await Promise.all(
      recipients.map((u) => this.notifications.createNotification(u.id, type, message)),
    );
  }

  // SALES RETURN
  async createSalesReturnForOrder(input: CreateOrderReturnInput) {
    const order = await this.prisma.saleOrder.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Try to find the associated sale
    const consumerSale = await this.prisma.consumerSale.findUnique({ where: { saleOrderId: input.orderId } });
    const resellerSale = !consumerSale
      ? await this.prisma.resellerSale.findUnique({ where: { SaleOrderid: input.orderId } })
      : null;
    if (!consumerSale && !resellerSale) {
      throw new NotFoundException('No sale found for order');
    }

    return this.createSalesReturn({
      type: (consumerSale ? 'CONSUMER' : 'RESELLER') as any,
      consumerSaleId: consumerSale?.id,
      resellerSaleId: resellerSale?.id ?? undefined,
      returnedById: input.returnedById,
      receivedById: input.receivedById,
      returnLocation: input.returnLocation as any,
      items: input.items,
    });
  }

  async createSalesReturn(input: CreateSalesReturnInput) {
    if (input.type === ('CONSUMER' as any) && !input.consumerSaleId) {
      throw new BadRequestException('consumerSaleId is required for CONSUMER returns');
    }
    if (input.type === ('RESELLER' as any) && !input.resellerSaleId) {
      throw new BadRequestException('resellerSaleId is required for RESELLER returns');
    }

    // Load the sale and items
    const sale = input.type === ('CONSUMER' as any)
      ? await this.prisma.consumerSale.findUnique({
          where: { id: input.consumerSaleId! },
          include: { items: true },
        })
      : await this.prisma.resellerSale.findUnique({
          where: { id: input.resellerSaleId! },
          include: { items: true },
        });
    if (!sale) throw new NotFoundException('Sale not found');

    // Validate quantities: cannot exceed sold minus already returned
    for (const it of input.items) {
      const soldQty = (sale.items.find((i: any) => i.productVariantId === it.productVariantId)?.quantity) || 0;
      // Sum previous returns for this sale and variant
      const prevReturns = await this.prisma.salesReturnItem.aggregate({
        _sum: { quantity: true },
        where: {
          productVariantId: it.productVariantId,
          return: input.type === ('CONSUMER' as any)
            ? { consumerSaleId: input.consumerSaleId! }
            : { resellerSaleId: input.resellerSaleId! },
        } as any,
      });
      const alreadyReturned = prevReturns._sum.quantity || 0;
      if (it.quantity <= 0) throw new BadRequestException('Return quantity must be > 0');
      if (it.quantity + alreadyReturned > soldQty) {
        throw new BadRequestException('Return quantity exceeds sold quantity for a line');
      }
    }

    const sr = await this.prisma.salesReturn.create({
      data: {
        type: input.type as any,
        consumerSaleId: input.consumerSaleId ?? null,
        resellerSaleId: input.resellerSaleId ?? null,
        returnedById: input.returnedById,
        receivedById: input.receivedById,
        storeId: (sale as any).storeId,
        status: 'PENDING' as any,
        returnLocation: input.returnLocation as any,
        items: {
          create: input.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            condition: i.condition,
          })),
        },
      },
      include: { items: true },
    });

    await this.domainEvents.publish(
      'SALES_RETURN_CREATED',
      { salesReturnId: sr.id, type: input.type },
      { aggregateType: 'SalesReturn', aggregateId: sr.id },
    );
    await this.notifyAdminsManagers('SALES_RETURN_CREATED', `Sales return ${sr.id} created`);
    return sr.id;
  }

  async updateSalesReturnStatus(input: UpdateSalesReturnStatusInput) {
    const sr = await this.prisma.salesReturn.findUnique({
      where: { id: input.id },
      include: { items: true },
    });
    if (!sr) throw new NotFoundException('Sales return not found');

    // Apply stock only when accepting the return
    if (input.status === ('ACCEPTED' as any)) {
      // Create stock movement IN
      const movement = await this.prisma.stockMovement.create({
        data: {
          storeId: sr.storeId,
          direction: 'IN' as any,
          movementType: 'RETURN_SALE' as any,
          referenceEntity: 'SalesReturn',
          referenceId: sr.id,
          items: {
            create: sr.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity })),
          },
        },
        include: { items: true },
      });
      // Adjust stock quantities
      for (const mi of movement.items) {
        await this.prisma.stock.upsert({
          where: {
            id: undefined,
            AND: [{ storeId: sr.storeId }, { productVariantId: mi.productVariantId }],
          },
          update: { quantity: { increment: mi.quantity } },
          create: { storeId: sr.storeId, productVariantId: mi.productVariantId, quantity: mi.quantity, reserved: 0 },
        });
      }
    }

    const updated = await this.prisma.salesReturn.update({
      where: { id: sr.id },
      data: { status: input.status as any, approvedById: input.approvedById ?? undefined },
    });
    await this.domainEvents.publish(
      'SALES_RETURN_STATUS_UPDATED',
      { salesReturnId: updated.id, status: input.status },
      { aggregateType: 'SalesReturn', aggregateId: updated.id },
    );
    return true;
  }

  // PURCHASE RETURN
  async createPurchaseReturn(input: CreatePurchaseReturnInput) {
    if (!input.items?.length) throw new BadRequestException('Return requires items');

    // Validate per-batch available quantities
    for (const it of input.items) {
      const batchItemAgg = await this.prisma.stockReceiptBatchItem.aggregate({
        _sum: { quantity: true },
        where: { stockReceiptBatchId: it.batchId, productVariantId: it.productVariantId },
      });
      const receivedQty = batchItemAgg._sum.quantity || 0;
      const prevReturnsAgg = await this.prisma.purchaseReturnItem.aggregate({
        _sum: { quantity: true },
        where: { batchId: it.batchId, productVariantId: it.productVariantId },
      });
      const alreadyReturned = prevReturnsAgg._sum.quantity || 0;
      if (it.quantity <= 0) throw new BadRequestException('Return quantity must be > 0');
      if (it.quantity + alreadyReturned > receivedQty) {
        throw new BadRequestException('Return quantity exceeds received quantity for a batch line');
      }
    }

    const pr = await this.prisma.purchaseReturn.create({
      data: {
        supplierId: input.supplierId,
        initiatedById: input.initiatedById,
        approvedById: input.approvedById,
        status: 'PENDING' as any,
        reason: input.reason ?? null,
        items: {
          create: input.items.map((i) => ({
            productVariantId: i.productVariantId,
            batchId: i.batchId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });
    await this.domainEvents.publish(
      'PURCHASE_RETURN_CREATED',
      { purchaseReturnId: pr.id },
      { aggregateType: 'PurchaseReturn', aggregateId: pr.id },
    );
    await this.notifyAdminsManagers('PURCHASE_RETURN_CREATED', `Purchase return ${pr.id} created`);
    return pr.id;
  }

  async fulfillPurchaseReturn(input: FulfillPurchaseReturnInput) {
    const pr = await this.prisma.purchaseReturn.findUnique({
      where: { id: input.id },
      include: { items: true },
    });
    if (!pr) throw new NotFoundException('Purchase return not found');

    // Group items by store via batch
    const batchIds = Array.from(new Set(pr.items.map((i) => i.batchId)));
    const batches = await this.prisma.stockReceiptBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, storeId: true },
    });
    const storeByBatch = new Map(batches.map((b) => [b.id, b.storeId] as const));

    // Create stock movement OUT per store
    const byStore: Record<string, { productVariantId: string; quantity: number }[]> = {};
    for (const it of pr.items) {
      const storeId = storeByBatch.get(it.batchId);
      if (!storeId) throw new BadRequestException('Invalid batch or missing store for return');
      byStore[storeId] = byStore[storeId] || [];
      byStore[storeId].push({ productVariantId: it.productVariantId, quantity: it.quantity });
    }

    for (const [storeId, items] of Object.entries(byStore)) {
      const movement = await this.prisma.stockMovement.create({
        data: {
          storeId,
          direction: MovementDirection.OUT as any,
          movementType: 'RETURN_PURCHASE' as any,
          referenceEntity: 'PurchaseReturn',
          referenceId: pr.id,
          items: { create: items },
        },
        include: { items: true },
      });
      for (const mi of movement.items) {
        await this.prisma.stock.upsert({
          where: { id: undefined, AND: [{ storeId }, { productVariantId: mi.productVariantId }] },
          update: { quantity: { decrement: mi.quantity } },
          create: { storeId, productVariantId: mi.productVariantId, quantity: -mi.quantity, reserved: 0 },
        });
      }
    }

    await this.prisma.purchaseReturn.update({
      where: { id: pr.id },
      data: { status: 'FULFILLED' as any },
    });
    await this.domainEvents.publish(
      'PURCHASE_RETURN_FULFILLED',
      { purchaseReturnId: pr.id },
      { aggregateType: 'PurchaseReturn', aggregateId: pr.id },
    );
    return true;
  }

  // Listings
  async salesReturnsByStore(storeId: string) {
    return this.prisma.salesReturn.findMany({
      where: { storeId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async salesReturnsByConsumerSale(consumerSaleId: string) {
    return this.prisma.salesReturn.findMany({
      where: { consumerSaleId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async salesReturnsByResellerSale(resellerSaleId: string) {
    return this.prisma.salesReturn.findMany({
      where: { resellerSaleId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async purchaseReturnsBySupplier(supplierId: string) {
    return this.prisma.purchaseReturn.findMany({
      where: { supplierId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
