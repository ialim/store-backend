import {
  Resolver,
  Mutation,
  Args,
  InputType,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceIngestService } from './invoice-ingest.service';
import { StockService } from '../stock/stock.service';
import { ProductVariantService } from '../catalogue/variant/product-variant.service';
import { LooseProductVariantInput } from '../catalogue/dto/loose-product-variant.input';
import { PurchaseOrderStatus as PrismaPurchaseOrderStatus } from '@prisma/client';

@InputType()
class ProcessInvoiceUrlInput {
  @Field()
  url!: string;
  @Field({ nullable: true })
  storeId?: string;
  @Field({ nullable: true })
  supplierName?: string;
  @Field({ nullable: true })
  receivedById?: string;
  @Field({ nullable: true })
  confirmedById?: string;
  @Field({ nullable: true })
  createPurchaseOrder?: boolean;
  @Field({ nullable: true })
  createSupplierPayment?: boolean;
  @Field({ nullable: true })
  receiveStock?: boolean;
}

@ObjectType()
class IngestLineResult {
  @Field()
  description!: string;
  @Field()
  qty!: number;
  @Field()
  unitPrice!: number;
  @Field({ nullable: true })
  discountPct?: number;
  @Field({ nullable: true })
  discountedUnitPrice?: number;
  @Field()
  lineTotal!: number;
  @Field({ nullable: true })
  variantId?: string;
  // Optional metadata not exposed via GraphQL
  barcode?: string | null;
}

@ObjectType()
class ProcessInvoiceResult {
  @Field()
  status!: string; // OK | NEEDS_REVIEW | FAILED
  @Field({ nullable: true })
  supplierId?: string;
  @Field({ nullable: true })
  supplierName?: string;
  @Field({ nullable: true })
  invoiceNumber?: string;
  @Field({ nullable: true })
  purchaseOrderId?: string;
  @Field({ nullable: true })
  totalAmount?: number;
  @Field(() => [IngestLineResult])
  lines!: IngestLineResult[];
  @Field({ nullable: true })
  message?: string;
}

@Resolver()
export class InvoiceIngestResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: InvoiceIngestService,
    private readonly stock: StockService,
    private readonly variants: ProductVariantService,
  ) {}

  @Mutation(() => ProcessInvoiceResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  async adminProcessInvoiceUrl(
    @Args('input') input: ProcessInvoiceUrlInput,
  ): Promise<ProcessInvoiceResult> {
    const messages: string[] = [];
    let text = '';
    try {
      text = await this.ingest.parseTextFromUrl(input.url);
    } catch (e: unknown) {
      return {
        status: 'FAILED',
        lines: [],
        message: `Fetch failed: ${
          (e as { message?: string })?.message || String(e)
        }`,
      };
    }

    const parsed = this.ingest.parseInvoiceText(text);
    if (!parsed.lines.length) {
      return {
        status: 'NEEDS_REVIEW',
        lines: [],
        message:
          'Unable to parse any line items. Provide a URL with a text layer or OCR first.',
      };
    }

    // Upsert supplier
    const supplierName =
      input.supplierName || parsed.supplierName || 'Unknown Supplier';
    // SupplierWhereUniqueInput expects id; use find/create since name is not unique
    let supplier = await this.prisma.supplier.findFirst({
      where: { name: supplierName },
    });
    if (!supplier) {
      supplier = await this.prisma.supplier.create({
        data: { name: supplierName, creditLimit: 0 },
      });
    }

    // Build PO items
    const poItems: {
      productVariantId: string;
      quantity: number;
      unitCost: number;
    }[] = [];
    const lineResults: IngestLineResult[] = [];
    for (const ln of parsed.lines) {
      // Prefer existing variant by barcode; otherwise create an orphan variant
      const found = ln.barcode
        ? await this.prisma.productVariant.findFirst({
            where: { barcode: ln.barcode },
          })
        : null;
      const variant =
        found ??
        (await this.variants.createLoose({
          productId: null,
          name: ln.description,
          size: 'STD',
          concentration: 'STD',
          packaging: 'STD',
          barcode: ln.barcode ?? null,
          price: ln.unitPrice,
          resellerPrice: ln.discountedUnitPrice ?? ln.unitPrice,
        } as LooseProductVariantInput));
      const variantId = variant.id;
      poItems.push({
        productVariantId: variantId,
        quantity: ln.qty,
        unitCost: ln.discountedUnitPrice ?? ln.unitPrice,
      });
      lineResults.push({ ...ln, variantId });
    }

    let purchaseOrderId: string | undefined;
    if (input.createPurchaseOrder) {
      const due = parsed.date ?? new Date();
      const po = await this.prisma.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          storeId: input.storeId ?? null,
          invoiceNumber: parsed.invoiceNumber || `INV-${Date.now()}`,
          status: PrismaPurchaseOrderStatus.PENDING,
          dueDate: due,
          totalAmount:
            parsed.total || lineResults.reduce((s, l) => s + l.lineTotal, 0),
          items: { create: poItems },
        },
        select: { id: true },
      });
      purchaseOrderId = po.id;
      messages.push(`Created Purchase Order ${po.id}`);
    }

    if (input.createSupplierPayment && purchaseOrderId) {
      await this.prisma.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          purchaseOrderId,
          amount:
            parsed.total || lineResults.reduce((s, l) => s + l.lineTotal, 0),
          paymentDate: new Date(),
          method: 'BANK_TRANSFER',
          notes: 'Auto-created from invoice ingestion',
        },
      });
      messages.push('Created Supplier Payment');
    }

    // Optionally auto-receive stock (requires storeId, receivedById, confirmedById and PO)
    if (input.receiveStock && purchaseOrderId) {
      if (!input.storeId || !input.receivedById || !input.confirmedById) {
        messages.push(
          'Receive stock skipped: storeId/receivedById/confirmedById required',
        );
      } else {
        await this.stock.receiveStockBatch({
          purchaseOrderId,
          storeId: input.storeId,
          receivedById: input.receivedById,
          confirmedById: input.confirmedById,
          waybillUrl: input.url,
          items: poItems.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
        });
        messages.push('Created Stock Receipt Batch');
      }
    }

    return {
      status: 'OK',
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: parsed.invoiceNumber,
      purchaseOrderId,
      totalAmount:
        parsed.total || lineResults.reduce((s, l) => s + l.lineTotal, 0),
      lines: lineResults,
      message: messages.join('; '),
    };
  }

  private parseInvoiceText(text: string): {
    supplierName?: string;
    invoiceNumber?: string;
    date?: Date;
    total?: number;
    lines: IngestLineResult[];
  } {
    const out = {
      supplierName: undefined as string | undefined,
      invoiceNumber: undefined as string | undefined,
      date: undefined as Date | undefined,
      total: undefined as number | undefined,
      lines: [] as IngestLineResult[],
    };
    const norm = text.replace(/\r/g, '');
    const invMatch = /Invoice:\s*([A-Z]?\d+)/i.exec(norm);
    if (invMatch) out.invoiceNumber = invMatch[1];
    const dateMatch = /Date:\s*(\d{2}[./-]\d{2}[./-]\d{4})/i.exec(norm);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1]
        .replace(/-/g, '.')
        .replace(/\//g, '.')
        .split('.')
        .map((x) => parseInt(x, 10));
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) out.date = new Date(y, m - 1, d);
    }
    const supplierMatch = /(Seinde\s+Signature\s+Ltd|Seinde\s+Signature)/i.exec(
      norm,
    );
    if (supplierMatch) out.supplierName = supplierMatch[1];

    const lines: IngestLineResult[] = [];
    const tableStart = norm.indexOf('Qty');
    const tableText = tableStart >= 0 ? norm.slice(tableStart) : norm;
    const rowRegex =
      /^\s*(\d+)\s+(.+?)\s+([\d,.]+)\s+(\d+)%\s+([\d,.]+)\s+([\d,.]+)\s*$/gm;
    let m: RegExpExecArray | null;
    const toNumber = (s: string) => parseFloat(s.replace(/,/g, ''));
    while ((m = rowRegex.exec(tableText))) {
      const qty = parseInt(m[1], 10) || 0;
      const desc = m[2].trim();
      const regular = toNumber(m[3]);
      const discPct = parseFloat(m[4]);
      const discounted = toNumber(m[5]);
      const amount = toNumber(m[6]);
      if (!qty || !desc) continue;
      lines.push({
        description: desc,
        qty,
        unitPrice: regular,
        discountPct: discPct,
        discountedUnitPrice: discounted,
        lineTotal: amount,
      });
    }
    if (!lines.length) {
      const simpleRow = /^\s*(\d+)\s+(.+?)\s+([\d,.]+)\s*$/gm;
      while ((m = simpleRow.exec(tableText))) {
        const qty = parseInt(m[1], 10) || 0;
        const desc = m[2].trim();
        const amount = toNumber(m[3]);
        if (!qty || !desc) continue;
        const unit = qty ? amount / qty : amount;
        lines.push({
          description: desc,
          qty,
          unitPrice: unit,
          lineTotal: amount,
        });
      }
    }
    const totMatch = /TOTAL\s*([\d,.]+)/i.exec(norm);
    if (totMatch) out.total = toNumber(totMatch[1]);
    return { ...out, lines };
  }
}
