import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

const CSV_PATH = resolve(process.cwd(), 'variants.csv');

interface CsvRow {
  legacyArticleCode: string;
  name: string;
  barcode: string | null;
  netPrice: number | null;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  // Drop header
  lines.shift();
  return lines.map((line) => {
    // handle BOM on first column if present
    const rawColumns = splitCsvLine(line);
    const columns = rawColumns.map((col, index) => {
      const trimmed = col.trim();
      if (index === 0) {
        return trimmed.replace(/^\ufeff/, '');
      }
      return trimmed;
    });
    const legacyArticleCode = columns[1]?.trim();
    const name = columns[2]?.trim() ?? '';
    const rawBarcode = columns[3]?.trim();
    const netPriceRaw = columns[6]?.trim();
    const barcode = rawBarcode ? rawBarcode : null;
    const netPrice = netPriceRaw ? Number.parseFloat(netPriceRaw) : null;
    return { legacyArticleCode, name, barcode, netPrice };
  });
}

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

async function main() {
  const rows = parseCsv(CSV_PATH);
  if (!rows.length) {
    console.log('No rows found in variants.csv');
    return;
  }

  let updated = 0;
  let created = 0;
  let skippedMissingBarcode = 0;
  let skippedNotFound = 0;
  let skippedMissingLegacyCode = 0;

  for (const row of rows) {
    const { legacyArticleCode, barcode, name, netPrice } = row;

    if (!legacyArticleCode) {
      skippedMissingLegacyCode += 1;
      continue;
    }

    if (!barcode) {
      skippedMissingBarcode += 1;
    }

    const matchClauses: Prisma.ProductVariantWhereInput[] = [
      { legacyArticleCode },
    ];
    if (barcode) {
      matchClauses.push({ barcode });
    }

    const variant = await prisma.productVariant.findFirst({
      where: { OR: matchClauses },
    });

    if (!variant) {
      try {
        await prisma.productVariant.create({
          data: {
            legacyArticleCode,
            name: name || null,
            barcode,
            price: netPrice ?? 0,
            resellerPrice: netPrice ?? 0,
          },
        });
        created += 1;
      } catch (error) {
        skippedNotFound += 1;
        console.warn(
          `Failed to create variant for article ${legacyArticleCode}:`,
          (error as Error).message,
        );
      }
      continue;
    }

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        legacyArticleCode,
        name: name || variant.name,
        barcode: barcode ?? variant.barcode,
        price: netPrice ?? variant.price,
        resellerPrice: netPrice ?? variant.resellerPrice,
      },
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        processed: rows.length,
        updated,
        created,
        skippedMissingBarcode,
        skippedMissingLegacyCode,
        skippedNotFound,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Failed to seed legacyArticleCode values:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
