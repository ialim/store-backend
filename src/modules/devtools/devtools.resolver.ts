import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  Prisma,
  InvoiceImportStatus as PrismaInvoiceImportStatus,
  PurchaseOrderStatus as PrismaPurchaseOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

function ensureDev() {
  const env = (process.env.ENV ?? process.env.NODE_ENV ?? '').toLowerCase();
  if (!['dev', 'development'].includes(env)) {
    throw new Error('Dev tools are only available in development');
  }
}

@ObjectType()
class DevCounts {
  @Field(() => Int)
  invoiceImports!: number;
  @Field(() => Int)
  purchaseOrders!: number;
  @Field(() => Int)
  orphanVariants!: number;
}

@InputType()
class DevPurgeFilter {
  @Field({ nullable: true })
  beforeDate?: string;
  @Field({ nullable: true })
  status?: string;
  @Field({ nullable: true })
  storeId?: string;
  @Field({ nullable: true })
  supplierId?: string;
  @Field({ nullable: true })
  dryRun?: boolean;
  @Field({ nullable: true })
  orphanOnly?: boolean;
}

type SnapshotProductVariantRow = Record<string, unknown> & { id?: unknown };
type SnapshotInvoiceImportRow = Record<string, unknown> & { id?: unknown };

const toOptionalString = (value: unknown): string | null =>
  value == null || typeof value === 'string' ? (value as string | null) : null;

const toNumeric = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
};

@Resolver()
export class DevToolsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => DevCounts)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devCounts(): Promise<DevCounts> {
    ensureDev();
    const [invoiceImports, purchaseOrders, orphanVariants] = await Promise.all([
      this.prisma.invoiceImport.count(),
      this.prisma.purchaseOrder.count(),
      this.prisma.productVariant.count({ where: { productId: null } }),
    ]);
    return { invoiceImports, purchaseOrders, orphanVariants };
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devPurgeInvoiceImports(
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<number> {
    ensureDev();
    const where: Prisma.InvoiceImportWhereInput = {};
    if (filter?.beforeDate)
      where.createdAt = { lt: new Date(filter.beforeDate) };
    if (filter?.status) {
      const normalizedStatus = filter.status.toUpperCase();
      if (normalizedStatus in PrismaInvoiceImportStatus) {
        where.status =
          PrismaInvoiceImportStatus[
            normalizedStatus as keyof typeof PrismaInvoiceImportStatus
          ];
      }
    }
    if (filter?.storeId) where.storeId = filter.storeId;
    if (filter?.dryRun) {
      return (await this.prisma.invoiceImport.count({ where })) || 0;
    }
    const res = await this.prisma.invoiceImport.deleteMany({ where });
    return res?.count || 0;
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devPurgePurchaseOrders(
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<number> {
    ensureDev();
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (filter?.beforeDate)
      where.createdAt = { lt: new Date(filter.beforeDate) };
    if (filter?.status) {
      const s = filter.status.toUpperCase();
      const allowed: Array<PrismaPurchaseOrderStatus> = [
        PrismaPurchaseOrderStatus.PENDING,
        PrismaPurchaseOrderStatus.RECEIVED,
        PrismaPurchaseOrderStatus.PARTIALLY_PAID,
        PrismaPurchaseOrderStatus.PAID,
        PrismaPurchaseOrderStatus.CANCELLED,
      ];
      const maybe = allowed.find((x) => x === (s as PrismaPurchaseOrderStatus));
      if (maybe) where.status = maybe;
    }
    if (filter?.storeId) where.storeId = filter.storeId;
    if (filter?.supplierId) where.supplierId = filter.supplierId;
    const found = await this.prisma.purchaseOrder.findMany({
      where,
      select: { id: true },
    });
    const ids = found.map((p) => p.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: { in: ids } },
    });
    const res = await this.prisma.purchaseOrder.deleteMany({
      where: { id: { in: ids } },
    });
    return res?.count || 0;
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devExportSnapshot(
    @Args('tables', { type: () => [String] }) tables: string[],
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<string> {
    ensureDev();
    const out: Record<string, any[]> = {};
    for (const t of tables) {
      if (t === 'invoiceImport') {
        const where: Prisma.InvoiceImportWhereInput = {};
        if (filter?.beforeDate)
          where.createdAt = { lt: new Date(filter.beforeDate) };
        if (filter?.status) {
          const normalizedStatus = filter.status.toUpperCase();
          if (normalizedStatus in PrismaInvoiceImportStatus) {
            where.status =
              PrismaInvoiceImportStatus[
                normalizedStatus as keyof typeof PrismaInvoiceImportStatus
              ];
          }
        }
        if (filter?.storeId) where.storeId = filter.storeId;
        out.invoiceImport = await this.prisma.invoiceImport.findMany({
          where,
          take: 1000,
        });
      }
      if (t === 'purchaseOrder') {
        const where: Prisma.PurchaseOrderWhereInput = {};
        if (filter?.beforeDate)
          where.createdAt = { lt: new Date(filter.beforeDate) };
        if (filter?.status) {
          const s = filter.status.toUpperCase();
          const allowed: Array<PrismaPurchaseOrderStatus> = [
            PrismaPurchaseOrderStatus.PENDING,
            PrismaPurchaseOrderStatus.RECEIVED,
            PrismaPurchaseOrderStatus.PARTIALLY_PAID,
            PrismaPurchaseOrderStatus.PAID,
            PrismaPurchaseOrderStatus.CANCELLED,
          ];
          const maybe = allowed.find(
            (x) => x === (s as PrismaPurchaseOrderStatus),
          );
          if (maybe) where.status = maybe;
        }
        if (filter?.storeId) where.storeId = filter.storeId;
        if (filter?.supplierId) where.supplierId = filter.supplierId;
        out.purchaseOrder = await this.prisma.purchaseOrder.findMany({
          where,
          take: 1000,
          include: { items: true },
        });
      }
      if (t === 'productVariant') {
        const where: Prisma.ProductVariantWhereInput = {};
        if (filter?.orphanOnly) where.productId = null;
        out.productVariant = await this.prisma.productVariant.findMany({
          where,
          take: 1000,
        });
      }
    }
    return JSON.stringify(out, null, 2);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devImportSnapshot(
    @Args('json') json: string,
    @Args('preview', { nullable: true }) preview?: boolean,
  ): Promise<string> {
    ensureDev();
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON');
    }
    const snapshot =
      parsed && typeof parsed === 'object'
        ? (parsed as {
            productVariant?: SnapshotProductVariantRow[];
            invoiceImport?: SnapshotInvoiceImportRow[];
          })
        : {};
    const variantRows = Array.isArray(snapshot.productVariant)
      ? snapshot.productVariant
      : [];
    const invoiceRows = Array.isArray(snapshot.invoiceImport)
      ? snapshot.invoiceImport
      : [];
    const summary: Record<string, number> = {
      productVariant: variantRows.length,
      invoiceImport: invoiceRows.length,
    };
    if (preview) return JSON.stringify({ preview: true, summary }, null, 2);
    if (variantRows.length) {
      for (const raw of variantRows) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw;
        const id = typeof row.id === 'string' ? row.id : undefined;
        if (!id) continue;
        const data: Prisma.ProductVariantUncheckedCreateInput = {
          name: toOptionalString(row.name),
          barcode: toOptionalString(row.barcode),
          price: toNumeric(row.price),
          resellerPrice: toNumeric(row.resellerPrice),
          productId: toOptionalString(row.productId),
        };
        await this.prisma.productVariant.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }
    }
    if (invoiceRows.length) {
      for (const raw of invoiceRows) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw;
        const id = typeof row.id === 'string' ? row.id : undefined;
        if (!id) continue;
        let parsedValue: Prisma.InvoiceImportUncheckedCreateInput['parsed'];
        if (row.parsed === undefined) parsedValue = undefined;
        else if (row.parsed === null) parsedValue = Prisma.JsonNull;
        else parsedValue = row.parsed as Prisma.InputJsonValue;
        const data: Prisma.InvoiceImportUncheckedCreateInput = {
          url: typeof row.url === 'string' ? row.url : '',
          supplierName: toOptionalString(row.supplierName),
          storeId: toOptionalString(row.storeId),
          status:
            (row.status as PrismaInvoiceImportStatus | undefined) ??
            PrismaInvoiceImportStatus.PENDING,
          message: toOptionalString(row.message),
          parsed: parsedValue,
        };
        await this.prisma.invoiceImport.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }
    }
    return JSON.stringify({ preview: false, summary }, null, 2);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devSeedFixtures(): Promise<string> {
    ensureDev();
    const pv1 = await this.prisma.productVariant.create({
      data: {
        name: 'Demo 50ml EDP',
        price: 10000,
        resellerPrice: 9000,
      },
    });
    const pv2 = await this.prisma.productVariant.create({
      data: {
        name: 'Demo 100ml EDP',
        price: 18000,
        resellerPrice: 16000,
      },
    });
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: { name: 'Demo Supplier' },
    });
    const supplier =
      existingSupplier ||
      (await this.prisma.supplier.create({
        data: { name: 'Demo Supplier', creditLimit: 0 },
      }));
    await this.prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        invoiceNumber: `INV-${Date.now()}`,
        status: PrismaPurchaseOrderStatus.PENDING,
        phase: 'ORDERED',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        totalAmount: 28000,
        items: {
          create: [
            { productVariantId: pv1.id, quantity: 1, unitCost: 10000 },
            { productVariantId: pv2.id, quantity: 1, unitCost: 18000 },
          ],
        },
      },
    });
    return 'OK';
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devPurgeOrphanVariants(
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<number> {
    ensureDev();
    // Find orphan variants first
    const found = await this.prisma.productVariant.findMany({
      where: { productId: null },
      select: { id: true },
    });
    const ids = found.map((v) => v.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    // Cascade delete dependent records that reference the variants
    await this.prisma.$transaction([
      // Product analytics
      this.prisma.productSalesStats.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      // Facet assignments and tier prices
      this.prisma.variantFacetValue.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.productVariantTierPrice.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      // Procurement references
      this.prisma.purchaseRequisitionItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.supplierCatalog.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.supplierQuoteItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.purchaseOrderItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      // Stock domain
      this.prisma.stockReceiptBatchItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.stockTransferItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.stockMovementItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.stock.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      // Sales domain
      this.prisma.quotationItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.resellerSaleItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.consumerSaleItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.salesReturnItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      this.prisma.purchaseReturnItem.deleteMany({
        where: { productVariantId: { in: ids } },
      }),
      // Finally remove the variants themselves
      this.prisma.productVariant.deleteMany({
        where: { id: { in: ids } },
      }),
    ]);
    return ids.length;
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devPurgeProducts(
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<number> {
    ensureDev();
    const where: Prisma.ProductWhereInput = {};
    if (filter?.beforeDate)
      where.createdAt = { lt: new Date(filter.beforeDate) };
    // Find target products first
    const found = await this.prisma.product.findMany({
      where,
      select: { id: true },
    });
    const ids = found.map((p) => p.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    // Remove product-level facet assignments
    await this.prisma.productFacetValue.deleteMany({
      where: { productId: { in: ids } },
    });
    // Delete products; variants will be left orphaned and can be purged separately
    const res = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });
    return res?.count || 0;
  }
}
