import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface VariantImportSummary {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface CsvRow {
  tariffId: number | null;
  articleCode: string | null;
  name: string;
  refProveedor: string | null;
  priceGross: number | null;
  discount: number | null;
  priceNet: number | null;
  priceGrossAlt: number | null;
  discountAlt: number | null;
  priceNetAlt: number | null;
  priceDate: string | null;
  warehouseCode: string | null;
  stockQuantity: number | null;
  stockDate: string | null;
}

const logger = new Logger('VariantImportService');

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseCsvContent(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }
  lines.shift();
  return lines.map((rawLine) => {
    const columns = splitCsvLine(rawLine).map((col, index) => {
      const trimmed = col.trim();
      if (index === 0) {
        return trimmed.replace(/^\ufeff/, '');
      }
      return trimmed;
    });
    return {
      tariffId: toNumber(columns[0]),
      articleCode: columns[1] || null,
      name: columns[2] || '',
      refProveedor: columns[3] || null,
      priceGross: toNumber(columns[4]),
      discount: toNumber(columns[5]),
      priceNet: toNumber(columns[6]),
      priceGrossAlt: toNumber(columns[7]),
      discountAlt: toNumber(columns[8]),
      priceNetAlt: toNumber(columns[9]),
      priceDate: columns[10] || null,
      warehouseCode: columns[11] || null,
      stockQuantity: toNumber(columns[12]),
      stockDate: columns[13] || null,
    };
  });
}

@Injectable()
export class VariantImportService {
  constructor(private readonly prisma: PrismaService) {}

  private async findMainStoreId(): Promise<string | null> {
    const mainStore = await this.prisma.store.findFirst({
      where: { isMain: true },
    });
    if (!mainStore) {
      logger.warn('No main store found; stock quantities will be ignored.');
      return null;
    }
    await this.prisma.legacyStoreMapping.upsert({
      where: { storeCode: 'RE' },
      update: { storeId: mainStore.id },
      create: { storeCode: 'RE', storeId: mainStore.id },
    });
    return mainStore.id;
  }

  async importFromCsv(buffer: Buffer): Promise<VariantImportSummary> {
    const content = buffer.toString('utf8');
    const rows = parseCsvContent(content);
    if (!rows.length) {
      return { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };
    }

    const mainStoreId = await this.findMainStoreId();

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      processed += 1;
      const legacyArticleCode = row.articleCode?.trim();
      if (!legacyArticleCode) {
        skipped += 1;
        continue;
      }
      const productName = row.name || legacyArticleCode;
      const listPrice = row.priceNet ?? row.priceGross ?? 0;
      const resellerPrice = row.priceNet ?? 0;

      const variantMatch: Prisma.ProductVariantWhereInput[] = [];
      if (legacyArticleCode) {
        variantMatch.push({ legacyArticleCode });
      }
      const barcode = row.refProveedor?.trim();
      if (barcode) {
        variantMatch.push({ barcode });
      }

      try {
        let variant = variantMatch.length
          ? await this.prisma.productVariant.findFirst({
              where: { OR: variantMatch },
            })
          : null;

        if (variant) {
          variant = await this.prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              legacyArticleCode,
              name: productName,
              barcode: barcode || undefined,
              price: listPrice,
              resellerPrice,
              productId: null,
            },
          });
          updated += 1;
        } else {
          variant = await this.prisma.productVariant.create({
            data: {
              legacyArticleCode,
              name: productName,
              barcode: barcode || undefined,
              price: listPrice,
              resellerPrice,
              productId: null,
            },
          });
          created += 1;
        }

        if (
          mainStoreId &&
          variant &&
          row.warehouseCode?.trim().toUpperCase() === 'RE'
        ) {
          const quantity =
            row.stockQuantity != null ? Math.round(row.stockQuantity) : 0;
          await this.prisma.stock.upsert({
            where: {
              storeId_productVariantId: {
                storeId: mainStoreId,
                productVariantId: variant.id,
              },
            },
            update: { quantity },
            create: {
              storeId: mainStoreId,
              productVariantId: variant.id,
              quantity,
              reserved: 0,
            },
          });
        }
      } catch (error) {
        logger.error(
          `Failed to import variant ${legacyArticleCode}: ${(error as Error).message}`,
        );
        errors.push(`Row ${processed}: ${(error as Error).message}`);
      }
    }

    return { processed, created, updated, skipped, errors };
  }
}
