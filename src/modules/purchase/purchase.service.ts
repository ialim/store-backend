import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { CreateSupplierInput } from './dto/create-supplier.input';
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
    await this.notificationService.createNotification(
      payment.supplierId,
      'SUPPLIER_PAYMENT',
      `Payment of ${payment.amount} recorded for supplier`,
    );
    return payment;
  }
}
