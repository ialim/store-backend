import {
  Resolver,
  Query,
  Mutation,
  Args,
  Field,
  InputType,
  Int,
  Float,
  ObjectType,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceIngestService } from './invoice-ingest.service';
import { StockService } from '../stock/stock.service';
import { InvoiceImport } from 'src/shared/prismagraphql/invoice-import';
import { normalizeParsedByVendor } from './vendor-rules';
import { InvoiceImportQueue } from './invoice-import.queue';
import { ProductVariantService } from '../catalogue/variant/product-variant.service';
import { Prisma, InvoiceImportStatus as PrismaInvoiceImportStatus, PurchaseOrderStatus as PrismaPurchaseOrderStatus } from '@prisma/client';

@InputType()
class CreateInvoiceImportInput {
  @Field(() => String) url!: string;
  @Field(() => String, { nullable: true }) supplierName?: string;
  @Field(() => String, { nullable: true }) storeId?: string;
}

@InputType()
class InvoiceImportLineInput {
  @Field(() => String) description!: string;
  @Field(() => Int) qty!: number;
  @Field(() => Float, { nullable: true }) unitPrice?: number;
  @Field(() => String, { nullable: true }) barcode?: string;
  @Field(() => Float, { nullable: true }) discountPct?: number;
  @Field(() => Float, { nullable: true }) discountedUnitPrice?: number;
  @Field(() => Float, { nullable: true }) lineTotal?: number;
}

@InputType()
class ApproveInvoiceImportInput {
  @Field(() => String) id!: string;
  @Field(() => String, { nullable: true }) supplierName?: string;
  @Field(() => String, { nullable: true }) storeId?: string;
  @Field({ nullable: true }) createPurchaseOrder?: boolean;
  @Field({ nullable: true }) createSupplierPayment?: boolean;
  @Field({ nullable: true }) receiveStock?: boolean;
  @Field(() => String, { nullable: true }) receivedById?: string;
  @Field(() => String, { nullable: true }) confirmedById?: string;
  @Field({ nullable: true }) useParsedTotal?: boolean;
  @Field(() => [InvoiceImportLineInput], { nullable: true })
  overrideLines?: InvoiceImportLineInput[];
}

@InputType()
class UpdateInvoiceImportInput {
  @Field(() => String) id!: string;
  @Field(() => String, { nullable: true }) url?: string;
  @Field(() => String, { nullable: true }) supplierName?: string;
  @Field(() => String, { nullable: true }) storeId?: string;
  @Field(() => String, { nullable: true }) invoiceNumber?: string;
}

@ObjectType()
class ApproveInvoiceResult {
  @Field(() => InvoiceImport)
  invoiceImport!: InvoiceImport;
  @Field(() => String, { nullable: true })
  purchaseOrderId?: string;
}

@Resolver()
export class InvoiceImportResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: InvoiceIngestService,
    private readonly stock: StockService,
    private readonly queue: InvoiceImportQueue,
    private readonly variants: ProductVariantService,
  ) {}

  private sanitizeRawText(text: string): string {
    // Remove NULLs and control characters that Postgres JSON/Text cannot store
    try {
      return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    } catch {
      return text;
    }
  }

  private sanitizeDeep<T>(value: T): T {
    const strip = (s: string) =>
      s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    if (value == null) return value;
    if (typeof value === 'string') return (strip(value) as unknown) as T;
    if (Array.isArray(value))
      return (value.map((v) => this.sanitizeDeep(v)) as unknown) as T;
    if (typeof value === 'object') {
      // Keep prototypes simple; build a plain object
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>))
        out[k] = this.sanitizeDeep(v);
      return (out as unknown) as T;
    }
    return value;
  }

  @Query(() => [InvoiceImport])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async invoiceImports(): Promise<InvoiceImport[]> {
    return this.prisma.invoiceImport.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Query(() => InvoiceImport, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async invoiceImport(@Args('id') id: string): Promise<InvoiceImport | null> {
    return this.prisma.invoiceImport.findUnique({ where: { id } });
  }

  @Mutation(() => InvoiceImport)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async adminCreateInvoiceImport(
    @Args('input') input: CreateInvoiceImportInput,
  ): Promise<InvoiceImport> {
    const created = await this.prisma.invoiceImport.create({
      data: {
        url: input.url,
        supplierName: input.supplierName ?? null,
        storeId: input.storeId ?? null,
        status: PrismaInvoiceImportStatus.PENDING,
      },
    });
    // Queue background processing for better UX
    try {
      await this.prisma.invoiceImport.update({
        where: { id: created.id },
        data: { status: PrismaInvoiceImportStatus.PROCESSING },
      });
      await this.queue.enqueue(
        created.id,
        input.url,
        created.supplierName ?? null,
      );
    } catch {}
    const row = await this.prisma.invoiceImport.findUnique({
      where: { id: created.id },
    });
    if (!row) throw new Error('Import not found after create');
    return row;
  }

  @Mutation(() => InvoiceImport)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async adminReprocessInvoiceImport(
    @Args('id') id: string,
  ): Promise<InvoiceImport> {
    const imp = await this.prisma.invoiceImport.findUnique({
      where: { id },
    });
    if (!imp) throw new Error('Import not found');
    // Enqueue background reprocessing
    await this.prisma.invoiceImport.update({
      where: { id },
      data: { status: PrismaInvoiceImportStatus.PROCESSING, message: 'Reprocessing…' },
    });
    await this.queue.enqueue(id, imp.url, imp.supplierName ?? null);
    const row = await this.prisma.invoiceImport.findUnique({ where: { id } });
    if (!row) throw new Error('Import not found after reprocess');
    return row;
  }

  // vendor normalization moved to vendor-rules.ts

  @Mutation(() => InvoiceImport)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async adminUpdateInvoiceImport(
    @Args('input') input: UpdateInvoiceImportInput,
  ): Promise<InvoiceImport> {
    const { id, invoiceNumber, ...data } = input as UpdateInvoiceImportInput & Record<string, unknown>;
    const existing = await this.prisma.invoiceImport.findUnique({
      where: { id },
    });
    const updateData: Prisma.InvoiceImportUncheckedUpdateInput = {};
    if (data.url !== undefined) updateData.url = String(data.url);
    if (data.supplierName !== undefined) updateData.supplierName = String(data.supplierName);
    if (data.storeId !== undefined) updateData.storeId = String(data.storeId);
    if (typeof invoiceNumber === 'string') {
      const base =
        existing?.parsed && typeof existing.parsed === 'object'
          ? (existing.parsed as Record<string, unknown>)
          : {};
      const parsed = this.sanitizeDeep({ ...base, invoiceNumber });
      updateData.parsed = parsed as unknown as Prisma.InputJsonValue;
    }
    await this.prisma.invoiceImport.update({
      where: { id },
      data: updateData,
    });
    const row2 = await this.prisma.invoiceImport.findUnique({ where: { id } });
    if (!row2) throw new Error('Import not found after update');
    return row2;
  }

  @Mutation(() => ApproveInvoiceResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async adminApproveInvoiceImport(
    @Args('input') input: ApproveInvoiceImportInput,
  ): Promise<ApproveInvoiceResult> {
    const imp = await (this.prisma as any).invoiceImport.findUnique({
      where: { id: input.id },
    });
    if (!imp) throw new Error('Import not found');
    const parsed = imp.parsed || { lines: [] };
    const override = (input as any).overrideLines as
      | InvoiceImportLineInput[]
      | undefined;
    const sourceLines =
      Array.isArray(override) && override.length ? override : parsed.lines;
    if (!parsed?.lines?.length) throw new Error('No parsed lines on import');

    // Supplier find/create by name
    const supplierName =
      input.supplierName || imp.supplierName || 'Unknown Supplier';
    let supplier = await this.prisma.supplier.findFirst({
      where: { name: supplierName },
    });
    if (!supplier)
      supplier = await this.prisma.supplier.create({
        data: { name: supplierName, creditLimit: 0 },
      });

    const poItems: Array<{
      productVariantId: string;
      quantity: number;
      unitCost: number;
    }> = [];
    for (const ln of sourceLines as InvoiceImportLineInput[]) {
      const desc = String(ln.description || '').trim();
      if (!desc) {
        continue;
      }
      // Prefer existing variant by barcode if provided
      let variant = ln.barcode
        ? await this.prisma.productVariant.findFirst({
            where: { barcode: ln.barcode },
          })
        : null;
      if (!variant)
        variant = await this.variants.createLoose({
          productId: null,
          name: desc,
          size: 'STD',
          concentration: 'STD',
          packaging: 'STD',
          barcode: ln.barcode ?? null,
          price: ln.unitPrice || 0,
          resellerPrice: ln.discountedUnitPrice || ln.unitPrice || 0,
        } as any);
      // If variant exists without barcode, set it from line
      if (ln.barcode && !variant.barcode) {
        try {
          variant = await this.prisma.productVariant.update({
            where: { id: variant.id },
            data: { barcode: ln.barcode },
          });
        } catch {}
      }
      // Ensure the variant has a human-friendly name; if missing, set it from the original item text
      if (!variant.name || !String(variant.name).trim()) {
        try {
          variant = await this.prisma.productVariant.update({
            where: { id: variant.id },
            data: { name: desc },
          });
        } catch {}
      }
      const qty = Number(ln.qty) || 1;
      const unitCost = (ln.discountedUnitPrice ??
        ln.unitPrice ??
        (ln.lineTotal != null ? Number(ln.lineTotal) / qty : 0)) as number;
      poItems.push({ productVariantId: variant.id, quantity: qty, unitCost });
    }

    let poId: string | undefined;
    // Pre-compute totals to ensure consistency between PO and Payment
    const lineSum = Array.isArray(sourceLines)
      ? (sourceLines as InvoiceImportLineInput[]).reduce((s: number, ln: InvoiceImportLineInput) => {
          const q = Number(ln.qty) || 1;
          const unit =
            ln.discountedUnitPrice ??
            ln.unitPrice ??
            (ln.lineTotal != null ? Number(ln.lineTotal) / q : 0);
          const tot =
            ln.lineTotal != null ? Number(ln.lineTotal) : Number(unit) * q;
          return s + (isFinite(tot) ? tot : 0);
        }, 0)
      : 0;
    const headerTotal = Number((parsed as { total?: number } | undefined)?.total || 0);
    const itemsTotal = poItems.reduce(
      (s: number, i: { unitCost: number; quantity: number }) => s + i.unitCost * i.quantity,
      0,
    );
    const finalTotal = (() => {
      if (input.useParsedTotal && headerTotal > 0) return headerTotal;
      if (!input.useParsedTotal && lineSum > 0) return lineSum;
      return lineSum || headerTotal || itemsTotal;
    })();
    if (input.createPurchaseOrder) {
      const po = await this.prisma.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          storeId: input.storeId || imp.storeId || null,
          invoiceNumber: parsed.invoiceNumber || `INV-${Date.now()}`,
          status: PrismaPurchaseOrderStatus.PENDING,
          dueDate: parsed.date ? new Date(parsed.date) : new Date(),
          totalAmount: finalTotal,
          items: { create: poItems },
        },
        select: { id: true },
      });
      poId = po.id;
    }
    if (input.createSupplierPayment && poId) {
      await this.prisma.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          purchaseOrderId: poId,
          amount: finalTotal,
          paymentDate: new Date(),
          method: 'BANK_TRANSFER',
          notes: 'Approved import',
        },
      });
    }
    if (input.receiveStock && poId) {
      if (!input.storeId || !input.receivedById || !input.confirmedById) {
        // leave as is, but don't throw
      } else {
        await this.stock.receiveStockBatch({
          purchaseOrderId: poId,
          storeId: input.storeId,
          receivedById: input.receivedById,
          confirmedById: input.confirmedById,
          waybillUrl: imp.url,
          items: poItems.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
        });
      }
    }

    await this.prisma.invoiceImport.update({
      where: { id: input.id },
      data: { status: PrismaInvoiceImportStatus.COMPLETED, message: 'Approved' },
    });
    const inv = await this.prisma.invoiceImport.findUnique({
      where: { id: input.id },
    });
    return {
      invoiceImport: inv,
      purchaseOrderId: poId,
    } as ApproveInvoiceResult;
  }
}
