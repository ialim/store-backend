import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { CreatePOsFromSelectionInput } from './dto/create-pos-from-selection.input';
import {
  MarkPurchaseOrderReceivedInput,
  UpdatePurchaseOrderPhaseInput,
} from './dto/update-po-phase.input';
import { CreatePurchaseRequisitionInput } from './dto/create-purchase-requisition.input';
import {
  IdInput,
  RejectRequisitionInput,
} from './dto/submit-purchase-requisition.input';
import { IssueRfqInput } from './dto/issue-rfq.input';
import { SubmitSupplierQuoteInput } from './dto/submit-supplier-quote.input';
import { DomainEventsService } from '../events/services/domain-events.service';
import { LinkSupplierUserInput } from './dto/link-supplier-user.input';
import {
  UpsertSupplierCatalogBulkInput,
  UpsertSupplierCatalogInput,
} from './dto/upsert-supplier-catalog.input';
import {
  RejectSupplierQuoteInput,
  SelectSupplierQuoteInput,
} from './dto/select-reject-supplier-quote.input';
import { CloseRfqInput } from './dto/close-rfq.input';
import { CreateRequisitionFromLowStockInput } from './dto/create-requisition-from-low-stock.input';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

  private async notifyAdminsManagersAccountants(type: string, message: string) {
    const recipients = await this.prisma.user.findMany({
      where: { role: { name: { in: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] } } },
      select: { id: true },
    });
    await Promise.all(
      recipients.map((u) =>
        this.notificationService.createNotification(u.id, type, message),
      ),
    );
  }

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
    await this.notifyAdminsManagersAccountants(
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
    await this.notifyAdminsManagersAccountants(
      'SUPPLIER_UPDATED',
      `Supplier ${sup.name} updated`,
    );
    return sup;
  }

  async linkSupplierUser(input: LinkSupplierUserInput) {
    // validate user exists when linking
    if (input.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!user) throw new NotFoundException('User not found');
    }
    const sup = await this.prisma.supplier.update({
      where: { id: input.supplierId },
      data: { userId: input.userId ?? null },
    });
    if (input.userId) {
      await this.notificationService.createNotification(
        input.userId,
        'SUPPLIER_LINKED',
        `Your account is now linked to supplier ${sup.name}.`,
      );
    }
    await this.domainEvents.publish(
      'SUPPLIER_USER_LINK_UPDATED',
      { supplierId: sup.id, userId: input.userId ?? null },
      { aggregateType: 'Supplier', aggregateId: sup.id },
    );
    return sup;
  }

  // Purchase Orders
  async purchaseOrders() {
    return this.prisma.purchaseOrder.findMany({ include: { items: true } });
  }

  async purchaseOrdersByStatus(status: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { status: status as any },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async purchaseOrdersByPhase(phase: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { phase: phase as any },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async purchaseOrdersOverdue() {
    const now = new Date();
    return this.prisma.purchaseOrder.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['PENDING', 'PARTIALLY_PAID'] as any },
      },
      include: { items: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  // Requisition and quotes listings for dashboards
  async requisitionsByStatus(status: string) {
    return this.prisma.purchaseRequisition.findMany({
      where: { status: status as any },
      select: {
        id: true,
        storeId: true,
        requestedById: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async supplierQuotesByRequisition(requisitionId: string) {
    return this.prisma.supplierQuote.findMany({
      where: { requisitionId },
      select: {
        id: true,
        requisitionId: true,
        supplierId: true,
        status: true,
        validUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async selectSupplierQuote(input: SelectSupplierQuoteInput) {
    const quote = await this.prisma.supplierQuote.findUnique({
      where: { id: input.quoteId },
    });
    if (!quote) throw new NotFoundException('Supplier quote not found');
    const updated = await this.prisma.supplierQuote.update({
      where: { id: quote.id },
      data: { status: 'SELECTED' as any },
    });
    if (input.exclusive ?? true) {
      await this.prisma.supplierQuote.updateMany({
        where: {
          requisitionId: updated.requisitionId,
          id: { not: updated.id },
        },
        data: { status: 'REJECTED' as any },
      });
    }
    await this.domainEvents.publish(
      'SUPPLIER_QUOTE_SELECTED',
      {
        quoteId: updated.id,
        requisitionId: updated.requisitionId,
        supplierId: updated.supplierId,
        exclusive: input.exclusive ?? true,
      },
      { aggregateType: 'SupplierQuote', aggregateId: updated.id },
    );
    // Notify store manager
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: updated.requisitionId },
    });
    if (req) {
      const store = await this.prisma.store.findUnique({
        where: { id: req.storeId },
      });
      if (store) {
        await this.notificationService.createNotification(
          store.managerId,
          'SUPPLIER_QUOTE_SELECTED',
          `Supplier quote selected for requisition ${req.id}.`,
        );
      }
    }
    return true;
  }

  async rejectSupplierQuote(input: RejectSupplierQuoteInput) {
    const quote = await this.prisma.supplierQuote.findUnique({
      where: { id: input.quoteId },
    });
    if (!quote) throw new NotFoundException('Supplier quote not found');
    await this.prisma.supplierQuote.update({
      where: { id: quote.id },
      data: { status: 'REJECTED' as any },
    });
    await this.domainEvents.publish(
      'SUPPLIER_QUOTE_REJECTED',
      {
        quoteId: quote.id,
        requisitionId: quote.requisitionId,
        supplierId: quote.supplierId,
        reason: input.reason,
      },
      { aggregateType: 'SupplierQuote', aggregateId: quote.id },
    );
    return true;
  }

  // Supplier catalog upserts and queries
  async upsertSupplierCatalog(input: UpsertSupplierCatalogInput) {
    const entry = await this.prisma.supplierCatalog.upsert({
      where: {
        supplierId_productVariantId: {
          supplierId: input.supplierId,
          productVariantId: input.productVariantId,
        },
      },
      update: {
        defaultCost: input.defaultCost,
        leadTimeDays: input.leadTimeDays ?? null,
        isPreferred: input.isPreferred ?? undefined,
      },
      create: {
        supplierId: input.supplierId,
        productVariantId: input.productVariantId,
        defaultCost: input.defaultCost,
        leadTimeDays: input.leadTimeDays ?? null,
        isPreferred: input.isPreferred ?? false,
      },
      select: {
        supplierId: true,
        productVariantId: true,
        defaultCost: true,
        leadTimeDays: true,
        isPreferred: true,
      },
    });
    await this.domainEvents.publish(
      'SUPPLIER_CATALOG_UPSERTED',
      { ...entry },
      {
        aggregateType: 'SupplierCatalog',
        aggregateId: `${entry.supplierId}:${entry.productVariantId}`,
      },
    );
    return entry;
  }

  async upsertSupplierCatalogBulk(input: UpsertSupplierCatalogBulkInput) {
    const results = [] as Array<{
      supplierId: string;
      productVariantId: string;
    }>;
    for (const it of input.items) {
      const r = await this.upsertSupplierCatalog(it);
      results.push({
        supplierId: r.supplierId,
        productVariantId: r.productVariantId,
      });
    }
    return results;
  }

  async supplierCatalogBySupplier(supplierId: string) {
    return this.prisma.supplierCatalog.findMany({
      where: { supplierId },
      select: {
        supplierId: true,
        productVariantId: true,
        defaultCost: true,
        leadTimeDays: true,
        isPreferred: true,
      },
      orderBy: { productVariantId: 'asc' },
    });
  }

  async supplierCatalogByVariant(productVariantId: string) {
    return this.prisma.supplierCatalog.findMany({
      where: { productVariantId },
      select: {
        supplierId: true,
        productVariantId: true,
        defaultCost: true,
        leadTimeDays: true,
        isPreferred: true,
      },
      orderBy: { defaultCost: 'asc' },
    });
  }

  // RFQ gaps
  async requisitionsWithNoSubmittedQuotes() {
    // Requisitions that have at least one SupplierQuote, but none SUBMITTED
    const reqs = await this.prisma.purchaseRequisition.findMany({
      where: {
        quotes: { some: {} },
      },
      select: {
        id: true,
        storeId: true,
        requestedById: true,
        status: true,
        createdAt: true,
      },
    });
    const results: typeof reqs = [];
    for (const r of reqs) {
      const submitted = await this.prisma.supplierQuote.count({
        where: { requisitionId: r.id, status: 'SUBMITTED' as any },
      });
      if (submitted === 0) results.push(r);
    }
    return results;
  }

  async rfqPendingSuppliers(requisitionId: string) {
    return this.prisma.supplierQuote.findMany({
      where: { requisitionId, NOT: { status: 'SUBMITTED' as any } },
      select: {
        id: true,
        requisitionId: true,
        supplierId: true,
        status: true,
        validUntil: true,
        createdAt: true,
      },
    });
  }

  async rfqStatusCounts(requisitionId: string) {
    const rows = await this.prisma.supplierQuote.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { requisitionId },
    });
    const map = new Map<string, number>();
    for (const r of rows as any[]) {
      map.set(r.status, r._count?._all ?? r._count);
    }
    const draft = map.get('DRAFT') || 0;
    const submitted = map.get('SUBMITTED') || 0;
    const selected = map.get('SELECTED') || 0;
    const rejected = map.get('REJECTED') || 0;
    return {
      requisitionId,
      draft,
      submitted,
      selected,
      rejected,
      total: draft + submitted + selected + rejected,
    };
  }

  async rfqCountsAll() {
    const rows = await this.prisma.supplierQuote.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows as any[]) {
      map.set(r.status, r._count?._all ?? r._count);
    }
    const draft = map.get('DRAFT') || 0;
    const submitted = map.get('SUBMITTED') || 0;
    const selected = map.get('SELECTED') || 0;
    const rejected = map.get('REJECTED') || 0;
    return {
      requisitionId: null,
      draft,
      submitted,
      selected,
      rejected,
      total: draft + submitted + selected + rejected,
    };
  }

  async rfqDashboard(requisitionId: string) {
    const counts = await this.rfqStatusCounts(requisitionId);
    const pending = await this.supplierQuotesByRequisition(requisitionId);
    const pendingQuotes = pending.filter((q: any) => q.status !== 'SUBMITTED');
    return { ...counts, pendingQuotes } as any;
  }

  async adminProcurementDashboard() {
    const [overduePOs, noSubs, partialSubs] = await Promise.all([
      this.purchaseOrdersOverdue(),
      this.requisitionsWithNoSubmittedQuotes(),
      this.requisitionsWithPartialSubmissions(),
    ]);
    const suppliers = await this.prisma.supplier.findMany({
      select: { id: true, name: true, creditLimit: true, currentBalance: true },
    });
    const creditBlockedSuppliers = suppliers
      .filter((s) => (s.currentBalance ?? 0) >= (s.creditLimit ?? 0))
      .map((s) => ({
        supplierId: s.id,
        name: s.name,
        creditLimit: s.creditLimit,
        currentBalance: s.currentBalance,
      }));
    return {
      overduePOs,
      noSubmissionRequisitions: noSubs,
      partialSubmissionRequisitions: partialSubs,
      creditBlockedSuppliers,
    } as any;
  }

  // Auto-draft requisition for low-stock items at a store based on reorderPoint
  async createRequisitionFromLowStock(input: CreateRequisitionFromLowStockInput) {
    const stocks = await this.prisma.stock.findMany({
      where: { storeId: input.storeId, reorderPoint: { not: null } },
      select: { productVariantId: true, quantity: true, reserved: true, reorderPoint: true, reorderQty: true },
    });
    const items: { productVariantId: string; requestedQty: number }[] = [];
    for (const s of stocks) {
      const available = (s.quantity || 0) - (s.reserved || 0);
      const rp = s.reorderPoint ?? 0;
      if (rp > 0 && available < rp) {
        const rq = s.reorderQty ?? (rp - available);
        if (rq > 0)
          items.push({ productVariantId: s.productVariantId, requestedQty: rq });
      }
    }
    if (!items.length) return null;
    const req = await this.prisma.purchaseRequisition.create({
      data: {
        storeId: input.storeId,
        requestedById: input.requestedById,
        status: 'DRAFT',
        items: { create: items.map((i) => ({ productVariantId: i.productVariantId, requestedQty: i.requestedQty })) },
      },
    });
    await this.domainEvents.publish('PURCHASE_REQUISITION_CREATED', { requisitionId: req.id, storeId: req.storeId, requestedById: req.requestedById, source: 'LOW_STOCK' }, { aggregateType: 'PurchaseRequisition', aggregateId: req.id });
    // Notify store manager
    const store = await this.prisma.store.findUnique({ where: { id: input.storeId } });
    if (store) {
      await this.notificationService.createNotification(store.managerId, 'LOW_STOCK_REQUISITION_CREATED', `Low-stock requisition ${req.id} created.`);
    }
    return req.id;
  }

  async rfqDashboardAll() {
    const counts = await this.rfqCountsAll();
    const pendingQuotes = await this.prisma.supplierQuote.findMany({
      where: { NOT: { status: 'SUBMITTED' as any } },
      select: {
        id: true,
        requisitionId: true,
        supplierId: true,
        status: true,
        validUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { ...counts, pendingQuotes } as any;
  }

  async requisitionsWithPartialSubmissions() {
    // Requisitions with at least one SUBMITTED and at least one non-SUBMITTED quote
    return this.prisma.purchaseRequisition.findMany({
      where: {
        AND: [
          { quotes: { some: { status: 'SUBMITTED' as any } } },
          { quotes: { some: { NOT: { status: 'SUBMITTED' as any } } } },
        ],
      },
      select: {
        id: true,
        storeId: true,
        requestedById: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Requisition + RFQ
  async createPurchaseRequisition(input: CreatePurchaseRequisitionInput) {
    if (!input.items?.length)
      throw new BadRequestException('Requisition requires items');
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
    // Domain event + notify store manager
    await this.domainEvents.publish(
      'PURCHASE_REQUISITION_CREATED',
      {
        requisitionId: req.id,
        storeId: req.storeId,
        requestedById: req.requestedById,
      },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
    // Notify store manager
    const store = await this.prisma.store.findUnique({
      where: { id: req.storeId },
    });
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
    await this.domainEvents.publish(
      'PURCHASE_REQUISITION_SUBMITTED',
      { requisitionId: req.id, storeId: req.storeId },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
    const store = await this.prisma.store.findUnique({
      where: { id: req.storeId },
    });
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
    const req = await this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    await this.domainEvents.publish(
      'PURCHASE_REQUISITION_APPROVED',
      { requisitionId: req.id, storeId: req.storeId },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
    return true;
  }

  async rejectPurchaseRequisition(input: RejectRequisitionInput) {
    const req = await this.prisma.purchaseRequisition.update({
      where: { id: input.id },
      data: { status: 'REJECTED' },
    });
    await this.domainEvents.publish(
      'PURCHASE_REQUISITION_REJECTED',
      { requisitionId: req.id, reason: input.reason },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
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
        where: {
          productVariantId: { in: req.items.map((i) => i.productVariantId) },
        },
        select: { supplierId: true },
        distinct: ['supplierId'],
      });
      supplierIds = catalogSuppliers.map((c) => c.supplierId);
    }
    if (!supplierIds.length)
      throw new BadRequestException('No candidate suppliers for RFQ');
    // Create SupplierQuote placeholders (one per supplier)
    for (const supplierId of supplierIds) {
      await this.prisma.supplierQuote.upsert({
        where: {
          requisitionId_supplierId: { requisitionId: req.id, supplierId },
        },
        update: {},
        create: {
          requisitionId: req.id,
          supplierId,
          status: 'DRAFT',
        },
      });
    }
    await this.domainEvents.publish(
      'RFQ_ISSUED',
      { requisitionId: req.id, supplierIds },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
    // Notify store manager
    const store = await this.prisma.store.findUnique({
      where: { id: req.storeId },
    });
    if (store) {
      await this.notificationService.createNotification(
        store.managerId,
        'RFQ_ISSUED',
        `RFQ issued for requisition ${req.id} to ${supplierIds.length} suppliers.`,
      );
    }
    // Notify supplier users if mapped
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, userId: true, name: true },
    });
    for (const s of suppliers) {
      if (s.userId) {
        await this.notificationService.createNotification(
          s.userId,
          'RFQ_INVITATION',
          `You have been invited to quote for requisition ${req.id}.`,
        );
      }
    }
    return true;
  }

  // Convenience: issue RFQ using preferred suppliers from SupplierCatalog
  async issueRFQPreferred(requisitionId: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }, include: { items: true } });
    if (!req) throw new NotFoundException('Requisition not found');
    const variantIds = req.items.map((i) => i.productVariantId);
    const preferred = await this.prisma.supplierCatalog.findMany({ where: { productVariantId: { in: variantIds }, isPreferred: true }, select: { supplierId: true }, distinct: ['supplierId'] });
    const supplierIds = preferred.map((p) => p.supplierId);
    if (!supplierIds.length) {
      throw new BadRequestException('No preferred suppliers found for requisition items');
    }
    await this.issueRFQ({ requisitionId, supplierIds });
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
    await this.prisma.supplierQuoteItem.deleteMany({
      where: { quoteId: quote.id },
    });
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
    await this.domainEvents.publish(
      'SUPPLIER_QUOTE_SUBMITTED',
      {
        quoteId: quote.id,
        supplierId: input.supplierId,
        requisitionId: input.requisitionId,
      },
      { aggregateType: 'SupplierQuote', aggregateId: quote.id },
    );
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

  // Close RFQ: reject selected categories of quotes and publish event
  async closeRFQ(input: CloseRfqInput) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id: input.requisitionId },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    const rejectStatuses: string[] = [];
    if (input.rejectDrafts ?? true) rejectStatuses.push('DRAFT');
    if (input.rejectUnsubmitted ?? true) rejectStatuses.push('SUBMITTED');
    if (rejectStatuses.length) {
      await this.prisma.supplierQuote.updateMany({
        where: {
          requisitionId: req.id,
          status: { in: rejectStatuses as any },
          NOT: { status: 'SELECTED' as any },
        },
        data: { status: 'REJECTED' as any },
      });
    }
    await this.domainEvents.publish(
      'RFQ_CLOSED',
      {
        requisitionId: req.id,
        rejectDrafts: input.rejectDrafts ?? true,
        rejectUnsubmitted: input.rejectUnsubmitted ?? true,
      },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );
    return true;
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
    await this.notifyAdminsManagersAccountants(
      'PURCHASE_ORDER_CREATED',
      `Purchase Order ${po.invoiceNumber} created`,
    );
    await this.domainEvents.publish(
      'PURCHASE_ORDER_CREATED',
      {
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        totalAmount: po.totalAmount,
      },
      { aggregateType: 'PurchaseOrder', aggregateId: po.id },
    );
    // Notify supplier user if mapped
    const sup = await this.prisma.supplier.findUnique({
      where: { id: po.supplierId },
      select: { userId: true, name: true },
    });
    if (sup?.userId) {
      await this.notificationService.createNotification(
        sup.userId,
        'PURCHASE_ORDER_CREATED',
        `PO ${po.invoiceNumber} created for your account.`,
      );
    }
    return po;
  }

  async updatePurchaseOrderStatus(data: UpdatePurchaseOrderStatusInput) {
    const current = await this.prisma.purchaseOrder.findUnique({ where: { id: data.id } });
    if (!current) throw new NotFoundException('Purchase order not found');
    const next = data.status as string;
    const cur = (current as any).status as string;
    const curPhase = (current as any).phase as string;
    // Guards to prevent regression or invalid manual changes
    if (curPhase === 'COMPLETED') {
      throw new BadRequestException('Cannot update status of a COMPLETED purchase order');
    }
    if (cur === 'CANCELLED') {
      throw new BadRequestException('Cannot update a CANCELLED purchase order');
    }
    if (cur === 'PAID' && next !== 'PAID') {
      throw new BadRequestException('Cannot regress from PAID status');
    }
    if (cur === 'RECEIVED' && next !== 'RECEIVED' && next !== 'PAID') {
      throw new BadRequestException('Cannot regress from RECEIVED status');
    }
    if (next === 'PENDING' && (cur === 'PARTIALLY_PAID' || cur === 'PAID' || cur === 'RECEIVED')) {
      throw new BadRequestException('Cannot set PENDING after payments or receipt');
    }
    if (next === 'PARTIALLY_PAID' && cur === 'PAID') {
      throw new BadRequestException('Cannot regress from PAID to PARTIALLY_PAID');
    }
    // If cancelling, ensure no payments or receipts exist
    if (next === 'CANCELLED') {
      const [paymentCount, receiptCount] = await Promise.all([
        this.prisma.supplierPayment.count({ where: { purchaseOrderId: data.id } }),
        this.prisma.stockReceiptBatch.count({ where: { purchaseOrderId: data.id } }),
      ]);
      if (paymentCount > 0 || receiptCount > 0) {
        throw new BadRequestException('Cannot cancel an order with payments or receipts');
      }
    }
    const po = await this.prisma.purchaseOrder.update({
      where: { id: data.id },
      data: { status: data.status },
    });
    await this.domainEvents.publish(
      'PURCHASE_ORDER_STATUS_UPDATED',
      { purchaseOrderId: po.id, status: data.status },
      { aggregateType: 'PurchaseOrder', aggregateId: po.id },
    );
    await this.notifyAdminsManagersAccountants(
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
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: payment.purchaseOrderId },
      });
      if (po) {
        const paidAgg = await this.prisma.supplierPayment.aggregate({
          _sum: { amount: true },
          where: { purchaseOrderId: po.id },
        });
        const paid = paidAgg._sum.amount || 0;
        const newStatus = paid >= po.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
        await this.prisma.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: newStatus as any,
            phase: (newStatus === 'PAID' ? 'INVOICING' : po.phase) as any,
          },
        });
        await this.domainEvents.publish(
          'PURCHASE_ORDER_STATUS_UPDATED',
          { purchaseOrderId: po.id, status: newStatus },
          { aggregateType: 'PurchaseOrder', aggregateId: po.id },
        );
        await this.maybeFinalizePurchaseOrder(po.id);
      }
    }
    await this.notifyAdminsManagersAccountants(
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
    if (!input.items?.length)
      throw new BadRequestException('No selections provided');

    const reqItemMap = new Map(req.items.map((i) => [i.productVariantId, i]));
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Validate split selections: if multiple selections exist for same variant,
    // explicit quantities are required and must sum to <= requestedQty
    const byVariant: Record<
      string,
      { count: number; qtySum: number; requested: number; needsQty: boolean }
    > = {};
    for (const sel of input.items) {
      const reqItem = reqItemMap.get(sel.productVariantId);
      if (!reqItem) {
        throw new BadRequestException(
          `Variant ${sel.productVariantId} not in requisition`,
        );
      }
      const key = sel.productVariantId;
      byVariant[key] = byVariant[key] || {
        count: 0,
        qtySum: 0,
        requested: reqItem.requestedQty,
        needsQty: false,
      };
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
    const bySupplier = new Map<
      string,
      Array<{
        productVariantId: string;
        quantity: number;
        unitCost: number;
      }>
    >();

    for (const sel of input.items) {
      const reqItem = reqItemMap.get(sel.productVariantId);
      if (!reqItem) {
        throw new BadRequestException(
          `Variant ${sel.productVariantId} not in requisition`,
        );
      }
      const quantity = sel.quantity ?? reqItem.requestedQty;
      if (quantity <= 0) throw new BadRequestException('Quantity must be > 0');

      let unitCost = sel.unitCost;
      if (unitCost == null) {
        // Try quote first
        const quote = await this.prisma.supplierQuote.findUnique({
          where: {
            requisitionId_supplierId: {
              requisitionId: req.id,
              supplierId: sel.supplierId,
            },
          },
        });
        if (quote) {
          const qi = await this.prisma.supplierQuoteItem.findFirst({
            where: {
              quoteId: quote.id,
              productVariantId: sel.productVariantId,
            },
          });
          if (qi?.unitCost != null) unitCost = qi.unitCost;
        }
      }
      if (unitCost == null) {
        // Fallback to supplier catalog
        const cat = await this.prisma.supplierCatalog.findUnique({
          where: {
            supplierId_productVariantId: {
              supplierId: sel.supplierId,
              productVariantId: sel.productVariantId,
            },
          },
        });
        if (cat?.defaultCost != null) unitCost = cat.defaultCost;
      }
      if (unitCost == null)
        throw new BadRequestException(
          `Missing unitCost for variant ${sel.productVariantId} from supplier ${sel.supplierId}`,
        );

      const arr = bySupplier.get(sel.supplierId) ?? [];
      arr.push({ productVariantId: sel.productVariantId, quantity, unitCost });
      bySupplier.set(sel.supplierId, arr);
    }

    const createdPOs: string[] = [];
    for (const [supplierId, lines] of bySupplier.entries()) {
      const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
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
      await this.domainEvents.publish(
        'PURCHASE_ORDER_CREATED',
        { purchaseOrderId: po.id, supplierId, totalAmount: total },
        { aggregateType: 'PurchaseOrder', aggregateId: po.id },
      );
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
      const store = await this.prisma.store.findUnique({
        where: { id: req.storeId },
      });
      if (store) {
        await this.notificationService.createNotification(
          store.managerId,
          'PURCHASE_ORDER_CREATED',
          `PO ${po.invoiceNumber} created for supplier ${supplier.name}.`,
        );
      }
      // Notify supplier user if mapped
      const supUser = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { userId: true },
      });
      if (supUser?.userId) {
        await this.notificationService.createNotification(
          supUser.userId,
          'PURCHASE_ORDER_CREATED',
          `PO ${po.invoiceNumber} created for your account.`,
        );
      }
    }

    // Move requisition along
    await this.prisma.purchaseRequisition.update({
      where: { id: req.id },
      data: { status: 'APPROVED' },
    });
    await this.domainEvents.publish(
      'PURCHASE_REQUISITION_APPROVED',
      { requisitionId: req.id },
      { aggregateType: 'PurchaseRequisition', aggregateId: req.id },
    );

    return createdPOs;
  }

  // Update PO phase manually (admin control)
  async updatePurchaseOrderPhase(input: UpdatePurchaseOrderPhaseInput) {
    const poCur = await this.prisma.purchaseOrder.findUnique({
      where: { id: input.id },
    });
    if (!poCur) throw new NotFoundException('Purchase order not found');
    const cur = (poCur as any).phase as string;
    const next = input.phase as string;
    if (cur === 'COMPLETED' && next !== 'COMPLETED') {
      throw new BadRequestException('Cannot change phase of a COMPLETED purchase order');
    }
    const allowed: Record<string, string[]> = {
      ORDERED: ['RECEIVING', 'INVOICING'],
      RECEIVING: ['INVOICING', 'COMPLETED'],
      INVOICING: ['COMPLETED'],
    };
    if (cur in allowed) {
      if (!allowed[cur].includes(next)) {
        throw new BadRequestException(
          `Invalid phase transition ${cur} -> ${next}`,
        );
      }
    }
    const po = await this.prisma.purchaseOrder.update({
      where: { id: input.id },
      data: { phase: next as any },
    });
    await this.domainEvents.publish(
      'PURCHASE_ORDER_PHASE_UPDATED',
      { purchaseOrderId: po.id, phase: input.phase },
      { aggregateType: 'PurchaseOrder', aggregateId: po.id },
    );
    return po;
  }

  // Mark PO as received (business action)
  async markPurchaseOrderReceived({ id }: MarkPurchaseOrderReceivedInput) {
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'RECEIVED' as any, phase: 'RECEIVING' as any },
    });
    await this.domainEvents.publish(
      'PURCHASE_ORDER_RECEIVED',
      { purchaseOrderId: po.id },
      { aggregateType: 'PurchaseOrder', aggregateId: po.id },
    );
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
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });
    if (!po) return;
    const paidAgg = await this.prisma.supplierPayment.aggregate({
      _sum: { amount: true },
      where: { purchaseOrderId: po.id },
    });
    const paid = paidAgg._sum.amount || 0;
    const isPaid = paid >= po.totalAmount;
    const isReceived = po.status === ('RECEIVED' as any);
    if (isPaid && isReceived) {
      await this.prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { phase: 'COMPLETED' as any },
      });
      await this.domainEvents.publish(
        'PURCHASE_COMPLETED',
        { purchaseOrderId: po.id },
        { aggregateType: 'PurchaseOrder', aggregateId: po.id },
      );
      await this.notificationService.createNotification(
        po.supplierId,
        'PURCHASE_COMPLETED',
        `PO ${po.invoiceNumber} completed.`,
      );
    }
  }
}
