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
import { PrismaService } from '../../common/prisma/prisma.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

function ensureDev() {
  if ((process.env.ENV || process.env.NODE_ENV) !== 'dev') {
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

@Resolver()
export class DevToolsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => DevCounts)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devCounts(): Promise<DevCounts> {
    ensureDev();
    const [invoiceImports, purchaseOrders, orphanVariants] = await Promise.all([
      (this.prisma as any).invoiceImport.count(),
      (this.prisma as any).purchaseOrder.count(),
      (this.prisma as any).productVariant.count({ where: { productId: null } }),
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
    const where: any = {};
    if (filter?.beforeDate)
      where.createdAt = { lt: new Date(filter.beforeDate) };
    if (filter?.dryRun) {
      return (await (this.prisma as any).invoiceImport.count({ where })) || 0;
    }
    const res = await (this.prisma as any).invoiceImport.deleteMany({ where });
    return res?.count || 0;
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devPurgePurchaseOrders(
    @Args('filter', { nullable: true }) filter?: DevPurgeFilter,
  ): Promise<number> {
    ensureDev();
    const where: any = {};
    if (filter?.beforeDate)
      where.createdAt = { lt: new Date(filter.beforeDate) };
    if (filter?.status) where.status = filter.status as any;
    if (filter?.storeId) where.storeId = filter.storeId;
    if (filter?.supplierId) where.supplierId = filter.supplierId;
    const found = await (this.prisma as any).purchaseOrder.findMany({
      where,
      select: { id: true },
    });
    const ids = found.map((p: any) => p.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    await (this.prisma as any).purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: { in: ids } },
    });
    const res = await (this.prisma as any).purchaseOrder.deleteMany({
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
        const where: any = {};
        if (filter?.beforeDate)
          where.createdAt = { lt: new Date(filter.beforeDate) };
        out.invoiceImport = await (this.prisma as any).invoiceImport.findMany({
          where,
          take: 1000,
        });
      }
      if (t === 'purchaseOrder') {
        const where: any = {};
        if (filter?.beforeDate)
          where.createdAt = { lt: new Date(filter.beforeDate) };
        if (filter?.status) where.status = filter.status as any;
        if (filter?.storeId) where.storeId = filter.storeId;
        if (filter?.supplierId) where.supplierId = filter.supplierId;
        out.purchaseOrder = await (this.prisma as any).purchaseOrder.findMany({
          where,
          take: 1000,
          include: { items: true },
        });
      }
      if (t === 'productVariant') {
        const where: any = {};
        if (filter?.orphanOnly) where.productId = null;
        out.productVariant = await (this.prisma as any).productVariant.findMany(
          { where, take: 1000 },
        );
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
    let obj: any;
    try {
      obj = JSON.parse(json);
    } catch (e: any) {
      throw new Error('Invalid JSON');
    }
    const summary: any = { productVariant: 0, invoiceImport: 0 };
    if (Array.isArray(obj?.productVariant))
      summary.productVariant = obj.productVariant.length;
    if (Array.isArray(obj?.invoiceImport))
      summary.invoiceImport = obj.invoiceImport.length;
    if (preview) return JSON.stringify({ preview: true, summary }, null, 2);
    // Import product variants (upsert by id)
    if (Array.isArray(obj?.productVariant)) {
      for (const r of obj.productVariant) {
        if (!r?.id) continue;
        const data: any = {
          name: r.name ?? null,
          size: r.size ?? null,
          concentration: r.concentration ?? null,
          packaging: r.packaging ?? null,
          barcode: r.barcode ?? null,
          price: r.price ?? 0,
          resellerPrice: r.resellerPrice ?? 0,
          productId: r.productId ?? null,
        };
        await (this.prisma as any).productVariant.upsert({
          where: { id: r.id },
          update: data,
          create: { id: r.id, ...data },
        });
      }
    }
    // Import invoice imports (upsert by id)
    if (Array.isArray(obj?.invoiceImport)) {
      for (const r of obj.invoiceImport) {
        if (!r?.id) continue;
        const data: any = {
          url: r.url ?? '',
          supplierName: r.supplierName ?? null,
          storeId: r.storeId ?? null,
          status: r.status ?? 'PENDING',
          message: r.message ?? null,
          parsed: r.parsed ?? null,
        };
        await (this.prisma as any).invoiceImport.upsert({
          where: { id: r.id },
          update: data,
          create: { id: r.id, ...data },
        });
      }
    }
    return JSON.stringify({ preview: false, summary }, null, 2);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async devSeedFixtures(
    @Args('kind', { nullable: true }) kind?: string,
  ): Promise<string> {
    ensureDev();
    const pv1 = await (this.prisma as any).productVariant.create({
      data: {
        name: 'Demo 50ml EDP',
        size: '50ml',
        concentration: 'EDP',
        packaging: 'Boxed',
        price: 10000,
        resellerPrice: 9000,
      },
    });
    const pv2 = await (this.prisma as any).productVariant.create({
      data: {
        name: 'Demo 100ml EDP',
        size: '100ml',
        concentration: 'EDP',
        packaging: 'Boxed',
        price: 18000,
        resellerPrice: 16000,
      },
    });
    const supplier = await (this.prisma as any).supplier.upsert({
      where: { name: 'Demo Supplier' },
      update: {},
      create: { name: 'Demo Supplier', creditLimit: 0 },
    });
    await (this.prisma as any).purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        invoiceNumber: `INV-${Date.now()}`,
        status: 'APPROVED' as any,
        phase: 'ORDERED' as any,
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
    const found = await (this.prisma as any).productVariant.findMany({
      where: { productId: null },
      select: { id: true },
    });
    const ids = found.map((v: any) => v.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    // Cascade delete dependent records that reference the variants
    await (this.prisma as any).$transaction([
      // Product analytics
      (this.prisma as any).productSalesStats.deleteMany({ where: { productVariantId: { in: ids } } }),
      // Facet assignments and tier prices
      (this.prisma as any).variantFacetValue.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).productVariantTierPrice.deleteMany({ where: { productVariantId: { in: ids } } }),
      // Procurement references
      (this.prisma as any).purchaseRequisitionItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).supplierCatalog.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).supplierQuoteItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).purchaseOrderItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      // Stock domain
      (this.prisma as any).stockReceiptBatchItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).stockTransferItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).stockMovementItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).stock.deleteMany({ where: { productVariantId: { in: ids } } }),
      // Sales domain
      (this.prisma as any).quotationItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).resellerSaleItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).consumerSaleItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).salesReturnItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      (this.prisma as any).purchaseReturnItem.deleteMany({ where: { productVariantId: { in: ids } } }),
      // Finally remove the variants themselves
      (this.prisma as any).productVariant.deleteMany({ where: { id: { in: ids } } }),
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
    const where: any = {};
    if (filter?.beforeDate) where.createdAt = { lt: new Date(filter.beforeDate) };
    // Find target products first
    const found = await (this.prisma as any).product.findMany({
      where,
      select: { id: true },
    });
    const ids = found.map((p: any) => p.id);
    if (!ids.length) return 0;
    if (filter?.dryRun) return ids.length;
    // Remove product-level facet assignments
    await (this.prisma as any).productFacetValue.deleteMany({
      where: { productId: { in: ids } },
    });
    // Delete products; variants will be left orphaned and can be purged separately
    const res = await (this.prisma as any).product.deleteMany({
      where: { id: { in: ids } },
    });
    return res?.count || 0;
  }
}
