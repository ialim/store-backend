import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { CreatePOsFromSelectionInput } from './dto/create-pos-from-selection.input';
import { MarkPurchaseOrderReceivedInput, UpdatePurchaseOrderPhaseInput } from './dto/update-po-phase.input';
import { CreatePurchaseRequisitionInput } from './dto/create-purchase-requisition.input';
import { IdInput, RejectRequisitionInput } from './dto/submit-purchase-requisition.input';
import { IssueRfqInput } from './dto/issue-rfq.input';
import { SubmitSupplierQuoteInput } from './dto/submit-supplier-quote.input';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Suppliers
  async suppliers() {
    return this.prisma.supplier.findMany();
  }

  async supplier(id: string) {
    const sup = await this.prisma.supplier.findUnique({ where: { id } });
    if (!sup) throw new NotFoundException('Supplier not found');
    return sup;
  }

  async createSupplier(data: CreateSupplierInput) {
    const sup = await this.prisma.supplier.create({ data });
    await this.notificationService.createNotification(
      sup.id,
      'SUPPLIER_CREATED',
      `Supplier ${sup.name} created`,
    );
    return sup;
  }

  async updateSupplier(data: UpdateSupplierInput) {
    const sup = await this.prisma.supplier.update({
      where: { id: data.id },
      data,
    });
    await this.notificationService.createNotification(
      sup.id,
      'SUPPLIER_UPDATED',
      `Supplier ${sup.name} updated`,
    );
    return sup;
  }

  // Purchase Orders
  async purchaseOrders() {
    return this.prisma.purchaseOrder.findMany({ include: { items: true } });
  }

  // Requisition + RFQ
  async createPurchaseRequisition(input: CreatePurchaseRequisitionInput) {
    if (!input.items?.length) throw new BadRequestException('Requisition requires items');
    const req = await this.prisma.purchaseRequisition.create({
      data: {
        storeId: input.storeId,
        requestedById: input.requestedById,
        status: 'DRAFT',
        items: {
          create: input.items.map((i) => ({
            productVariantId: i.productVariantId,
            requestedQty: i.requestedQty,
            notes: i.notes || undefined,
          })),
        },
      },
      include: { items: true },
    });
    // Notify store manager
    const store = await this.prisma.store.findUnique({ where: { id: req.storeId } });
    if (store) {
      await this.notificationService.createNotification(
        store.managerId,
        'PURCHASE_REQUISITION_CREATED',
        `Requisition ${req.id} created for store ${store.name}.`,
      );
    }
    return req.id;
  }

  async submitPurchaseRequisition({ id }: IdInput) {
    const req = await this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: 'SENT' },
    });
    const store = await this.prisma.store.findUnique({ where: { id: req.storeId } });
    if (store) {
      await this.notificationService.createNotification(
        store.managerId,
        'PURCHASE_REQUISITION_SUBMITTED',
        `Requisition ${req.id} submitted for review.`,
      );
    }
    return true;
  }

  async approvePurchaseRequisition({ id }: IdInput) {
    await this.prisma.purchaseRequisition.update({ where: { id }, data: { status: 'APPROVED' } });
    return true;
  }

  async rejectPurchaseRequisition(input: RejectRequisitionInput) {
    await this.prisma.purchaseRequisition.update({ where: { id: input.id }, data: { status: 'REJECTED' } });
    return true;
  }

  async issueRFQ(input: IssueRfqInput) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: input.requisitionId },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    // Determine suppliers: provided or from catalog
    let supplierIds = input.supplierIds;
    if (!supplierIds || supplierIds.length === 0) {
      const catalogSuppliers = await this.prisma.supplierCatalog.findMany({
        where: { productVariantId: { in: req.items.map((i) => i.productVariantId) } },
        select: { supplierId: true },
        distinct: ['supplierId'],
      });
      supplierIds = catalogSuppliers.map((c) => c.supplierId);
    }
    if (!supplierIds.length) throw new BadRequestException('No candidate suppliers for RFQ');
    // Create SupplierQuote placeholders (one per supplier)
    for (const supplierId of supplierIds) {
      await this.prisma.supplierQuote.upsert({
        where: { requisitionId_supplierId: { requisitionId: req.id, supplierId } },
        update: {},
        create: {
          requisitionId: req.id,
          supplierId,
          status: 'DRAFT',
        },
      });
    }
    // Notify store manager
    const store = await this.prisma.store.findUnique({ where: { id: req.storeId } });
    if (store) {
      await this.notificationService.createNotification(
        store.managerId,
        'RFQ_ISSUED',
        `RFQ issued for requisition ${req.id} to ${supplierIds.length} suppliers.`,
      );
    }
    return true;
  }

  async submitSupplierQuote(input: SubmitSupplierQuoteInput) {
    // Create/update quote and items
    const quote = await this.prisma.supplierQuote.upsert({
      where: {
        requisitionId_supplierId: {
          requisitionId: input.requisitionId,
          supplierId: input.supplierId,
        },
      },
      update: {
        status: 'SUBMITTED',
        validUntil: input.validUntil || undefined,
        notes: input.notes || undefined,
      },
      create: {
        requisitionId: input.requisitionId,
        supplierId: input.supplierId,
        status: 'SUBMITTED',
        validUntil: input.validUntil || undefined,
        notes: input.notes || undefined,
      },
    });
    // Replace items
    await this.prisma.supplierQuoteItem.deleteMany({ where: { quoteId: quote.id } });
    if (input.items?.length) {
      await this.prisma.supplierQuoteItem.createMany({
        data: input.items.map((i) => ({
          quoteId: quote.id,
          productVariantId: i.productVariantId,
          unitCost: i.unitCost,
          minQty: i.minQty || null,
          leadTimeDays: i.leadTimeDays || null,
        })),
      });
    }
    return quote.id;
  }

  async purchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPurchaseOrder(data: CreatePurchaseOrderInput) {
    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        status: 'PENDING',
        dueDate: data.dueDate,
        totalAmount: data.totalAmount,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      po.id,
      'PURCHASE_ORDER_CREATED',
      `Purchase Order ${po.invoiceNumber} created`,
    );
    return po;
  }

  async updatePurchaseOrderStatus(data: UpdatePurchaseOrderStatusInput) {
    const po = await this.prisma.purchaseOrder.update({
      where: { id: data.id },
      data: { status: data.status },
    });
    await this.notificationService.createNotification(
      po.id,
      'PURCHASE_ORDER_UPDATED',
      `Purchase Order ${po.invoiceNumber} status updated to ${data.status}`,
    );
    return po;
  }

  // Supplier Payments
  async supplierPayments() {
    return this.prisma.supplierPayment.findMany();
  }

  async createSupplierPayment(data: CreateSupplierPaymentInput) {
    const payment = await this.prisma.supplierPayment.create({ data });
    // Reduce supplier current balance
    await this.prisma.supplier.update({
      where: { id: payment.supplierId },
      data: { currentBalance: { decrement: payment.amount } as any },
    });
    // If applied to a PO, update its payment status
    if (payment.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({ where: { id: payment.purchaseOrderId } });
      if (po) {
        const paidAgg = await this.prisma.supplierPayment.aggregate({
          _sum: { amount: true },
          where: { purchaseOrderId: po.id },
        });
        const paid = paidAgg._sum.amount || 0;
        const newStatus = paid >= po.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
        await this.prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: newStatus as any, phase: (newStatus === 'PAID' ? 'INVOICING' : po.phase) as any } });
        await this.maybeFinalizePurchaseOrder(po.id);
      }
    }
    await this.notificationService.createNotification(
      payment.supplierId,
      'SUPPLIER_PAYMENT',
      `Payment of ${payment.amount} recorded for supplier`,
    );
    return payment;
  }

  // Create PO(s) from selected supplier quotes per line with credit check
  async createPOsFromSelection(input: CreatePOsFromSelectionInput) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: input.requisitionId },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    if (!input.items?.length) throw new BadRequestException('No selections provided');

    const reqItemMap = new Map(req.items.map((i) => [i.productVariantId, i]));
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Validate split selections: if multiple selections exist for same variant,
    // explicit quantities are required and must sum to <= requestedQty
    const byVariant: Record<string, { count: number; qtySum: number; requested: number; needsQty: boolean }>= {};
    for (const sel of input.items) {
      const reqItem = reqItemMap.get(sel.productVariantId);
      if (!reqItem) {
        throw new BadRequestException(`Variant ${sel.productVariantId} not in requisition`);
      }
      const key = sel.productVariantId;
      byVariant[key] = byVariant[key] || { count: 0, qtySum: 0, requested: reqItem.requestedQty, needsQty: false };
      byVariant[key].count += 1;
      if (sel.quantity != null) byVariant[key].qtySum += sel.quantity;
    }
    for (const [variantId, rec] of Object.entries(byVariant)) {
      if (rec.count > 1) {
        // When split across suppliers, enforce explicit quantities and cap
        const allHaveQty = input.items
          .filter((i) => i.productVariantId === variantId)
          .every((i) => i.quantity != null && i.quantity! > 0);
        if (!allHaveQty) {
          throw new BadRequestException(
            `Quantity must be specified for all split selections of variant ${variantId}`,
          );
        }
        if (rec.qtySum > rec.requested) {
          throw new BadRequestException(
            `Split quantities (${rec.qtySum}) exceed requested (${rec.requested}) for variant ${variantId}`,
          );
        }
      }
    }

    // Group selections by supplier
    const bySupplier = new Map<string, Array<{
      productVariantId: string; quantity: number; unitCost: number;
    }>>();

    for (const sel of input.items) {
      const reqItem = reqItemMap.get(sel.productVariantId);
      if (!reqItem) {
        throw new BadRequestException(`Variant ${sel.productVariantId} not in requisition`);
      }
      const quantity = sel.quantity ?? reqItem.requestedQty;
      if (quantity <= 0) throw new BadRequestException('Quantity must be > 0');

      let unitCost = sel.unitCost;
      if (unitCost == null) {
        // Try quote first
        const quote = await this.prisma.supplierQuote.findUnique({
          where: { requisitionId_supplierId: { requisitionId: req.id, supplierId: sel.supplierId } },
        });
        if (quote) {
          const qi = await this.prisma.supplierQuoteItem.findFirst({
            where: { quoteId: quote.id, productVariantId: sel.productVariantId },
          });
          if (qi?.unitCost != null) unitCost = qi.unitCost;
        }
      }
      if (unitCost == null) {
        // Fallback to supplier catalog
        const cat = await this.prisma.supplierCatalog.findUnique({
          where: { supplierId_productVariantId: { supplierId: sel.supplierId, productVariantId: sel.productVariantId } },
        });
        if (cat?.defaultCost != null) unitCost = cat.defaultCost;
      }
      if (unitCost == null) throw new BadRequestException(`Missing unitCost for variant ${sel.productVariantId} from supplier ${sel.supplierId}`);

      const arr = bySupplier.get(sel.supplierId) ?? [];
      arr.push({ productVariantId: sel.productVariantId, quantity, unitCost });
      bySupplier.set(sel.supplierId, arr);
    }

    const createdPOs: string[] = [];
    for (const [supplierId, lines] of bySupplier.entries()) {
      const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
      const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new NotFoundException('Supplier not found');
      const projected = supplier.currentBalance + total;
      if (projected > supplier.creditLimit) {
        throw new BadRequestException(
          `Credit limit exceeded for supplier ${supplier.name}. Required: ${projected.toFixed(2)} > limit ${supplier.creditLimit.toFixed(2)}`,
        );
      }

      const po = await this.prisma.purchaseOrder.create({
        data: {
          supplierId,
          invoiceNumber: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          status: 'PENDING',
          phase: 'ORDERED' as any,
          dueDate: input.dueDate ?? defaultDueDate,
          totalAmount: total,
          items: {
            create: lines.map((l) => ({
              productVariantId: l.productVariantId,
              quantity: l.quantity,
              unitCost: l.unitCost,
            })),
          },
        },
        include: { items: true },
      });
      createdPOs.push(po.id);
      // Update supplier balance
      await this.prisma.supplier.update({
        where: { id: supplierId },
        data: { currentBalance: { increment: total } as any },
      });
      // Mark quote as selected if exists
      await this.prisma.supplierQuote.updateMany({
        where: { requisitionId: req.id, supplierId },
        data: { status: 'SELECTED' },
      });
      // Notify store manager
      const store = await this.prisma.store.findUnique({ where: { id: req.storeId } });
      if (store) {
        await this.notificationService.createNotification(
          store.managerId,
          'PURCHASE_ORDER_CREATED',
          `PO ${po.invoiceNumber} created for supplier ${supplier.name}.`,
        );
      }
    }

    // Move requisition along
    await this.prisma.purchaseRequisition.update({
      where: { id: req.id },
      data: { status: 'APPROVED' },
    });

    return createdPOs;
  }

  // Update PO phase manually (admin control)
  async updatePurchaseOrderPhase(input: UpdatePurchaseOrderPhaseInput) {
    const po = await this.prisma.purchaseOrder.update({
      where: { id: input.id },
      data: { phase: input.phase as any },
    });
    return po;
  }

  // Mark PO as received (business action)
  async markPurchaseOrderReceived({ id }: MarkPurchaseOrderReceivedInput) {
    const po = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED' as any, phase: 'RECEIVING' as any } });
    await this.notificationService.createNotification(
      po.supplierId,
      'PURCHASE_ORDER_RECEIVED',
      `PO ${po.invoiceNumber} marked as received.`,
    );
    await this.maybeFinalizePurchaseOrder(id);
    return po;
  }

  // Finalize PO when paid and received
  private async maybeFinalizePurchaseOrder(poId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) return;
    const paidAgg = await this.prisma.supplierPayment.aggregate({ _sum: { amount: true }, where: { purchaseOrderId: po.id } });
    const paid = paidAgg._sum.amount || 0;
    const isPaid = paid >= po.totalAmount;
    const isReceived = po.status === ('RECEIVED' as any);
    if (isPaid && isReceived) {
      await this.prisma.purchaseOrder.update({ where: { id: po.id }, data: { phase: 'COMPLETED' as any } });
      await this.notificationService.createNotification(
        po.supplierId,
        'PURCHASE_COMPLETED',
        `PO ${po.invoiceNumber} completed.`,
      );
    }
  }
}
