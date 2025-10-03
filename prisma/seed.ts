import { PrismaClient, UserTier, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

const VARIANTS_CSV_PATH = resolve(process.cwd(), 'variants.csv');

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

function parseVariantsCsv(): CsvRow[] {
  if (!existsSync(VARIANTS_CSV_PATH)) {
    return [];
  }
  const content = readFileSync(VARIANTS_CSV_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }
  // drop header
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

async function seedVariantsFromCsv(): Promise<void> {
  const rows = parseVariantsCsv();
  if (!rows.length) {
    console.log('No variant rows found in variants.csv, skipping CSV-based seeding.');
    return;
  }

  for (const row of rows) {
    const legacyArticleCode = row.articleCode?.trim();
    if (!legacyArticleCode) {
      continue;
    }
    const productName = row.name || legacyArticleCode;

    const listPrice = row.priceNet ?? row.priceGross ?? 0;
    const resellerPrice = row.priceNet ?? 0;

    const variantMatchClauses = [] as Prisma.ProductVariantWhereInput[];
    if (legacyArticleCode) {
      variantMatchClauses.push({ legacyArticleCode });
    }
    if (row.refProveedor) {
      variantMatchClauses.push({ barcode: row.refProveedor });
    }

    let variant = variantMatchClauses.length
      ? await prisma.productVariant.findFirst({ where: { OR: variantMatchClauses } })
      : null;

    if (variant) {
      variant = await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          legacyArticleCode,
          name: productName,
          barcode: row.refProveedor || undefined,
          price: listPrice,
          resellerPrice,
          productId: null,
        },
      });
    } else {
      variant = await prisma.productVariant.create({
        data: {
          legacyArticleCode,
          name: productName,
          barcode: row.refProveedor || undefined,
          price: listPrice,
          resellerPrice,
          productId: null,
        },
      });
    }
  }

  console.log(`Seeded ${rows.length} variants from variants.csv`);
}

async function main() {
  // --- Permissions ---
  const permissions = [
    { name: 'MANAGE_USERS', module: 'User', action: 'ALL' },
    { name: 'MANAGE_PRODUCTS', module: 'Product', action: 'ALL' },
    { name: 'VIEW_REPORTS', module: 'Analytics', action: 'READ' },
    {
      name: 'COMPLETE_CUSTOMER_PROFILE',
      module: 'CustomerProfile',
      action: 'UPDATE',
    },
    { name: 'APPLY_RESELLER', module: 'ResellerProfile', action: 'CREATE' },
    { name: 'APPROVE_RESELLER', module: 'ResellerProfile', action: 'UPDATE' },
    { name: 'CREATE_STAFF', module: 'Staff', action: 'CREATE' },
    { name: 'ASSIGN_MANAGER', module: 'Store', action: 'UPDATE' },
    { name: 'ASSIGN_BILLER', module: 'ResellerProfile', action: 'UPDATE' },
  ];
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // --- Roles ---
  const roleDefs = [
    { name: 'SUPERADMIN', description: 'Full system access' },
    { name: 'ADMIN', description: 'Manage users and settings' },
    {
      name: 'ACCOUNTANT',
      description: 'Manage supplier payments and invoicing',
    },
    { name: 'BILLER', description: 'Handle reseller accounts' },
    { name: 'MANAGER', description: 'Manage stores and inventory' },
    { name: 'RESELLER', description: 'B2B customer' },
    { name: 'CUSTOMER', description: 'B2C customer' },
  ];
  for (const roleDef of roleDefs) {
    await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {},
      create: roleDef,
    });
  }

  // Assign permissions to roles
  const allPerms = await prisma.permission.findMany();
  // SUPERADMIN gets all
  await prisma.role.update({
    where: { name: 'SUPERADMIN' },
    data: { permissions: { connect: allPerms.map((p) => ({ id: p.id })) } },
  });
  // ADMIN
  const adminPerms = allPerms.filter((p) =>
    ['MANAGE_USERS', 'VIEW_REPORTS', 'APPROVE_RESELLER'].includes(p.name),
  );
  await prisma.role.update({
    where: { name: 'ADMIN' },
    data: { permissions: { connect: adminPerms.map((p) => ({ id: p.id })) } },
  });
  // BILLER
  const billerPerms = allPerms.filter((p) =>
    ['APPLY_RESELLER', 'COMPLETE_CUSTOMER_PROFILE'].includes(p.name),
  );
  await prisma.role.update({
    where: { name: 'BILLER' },
    data: { permissions: { connect: billerPerms.map((p) => ({ id: p.id })) } },
  });
  // MANAGER
  const managerPerms = allPerms.filter((p) =>
    ['ASSIGN_MANAGER', 'ASSIGN_BILLER', 'APPROVE_RESELLER'].includes(p.name),
  );
  await prisma.role.update({
    where: { name: 'MANAGER' },
    data: { permissions: { connect: managerPerms.map((p) => ({ id: p.id })) } },
  });

  // ACCOUNTANT
  const accountantPerms = allPerms.filter((p) =>
    ['VIEW_REPORTS'].includes(p.name),
  );
  await prisma.role.update({
    where: { name: 'ACCOUNTANT' },
    data: {
      permissions: { connect: accountantPerms.map((p) => ({ id: p.id })) },
    },
  });

  // --- Users & Profiles ---
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'SUPERADMIN' } }))?.id ||
        '',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'MANAGER' } }))?.id ||
        '',
    },
  });

  const biller = await prisma.user.upsert({
    where: { email: 'biller@example.com' },
    update: {},
    create: {
      email: 'biller@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'BILLER' } }))?.id || '',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@example.com' },
    update: {},
    create: {
      email: 'accountant@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'ACCOUNTANT' } }))?.id ||
        '',
    },
  });

  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@example.com' },
    update: {},
    create: {
      email: 'reseller@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'RESELLER' } }))?.id ||
        '',
      resellerProfile: {
        create: {
          billerId: biller.id,
          tier: UserTier.BRONZE,
          creditLimit: 1000000,
          profileStatus: 'ACTIVE',
        },
      },
    },
    include: { resellerProfile: true },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash,
      roleId:
        (await prisma.role.findUnique({ where: { name: 'CUSTOMER' } }))?.id ||
        '',
      customerProfile: {
        create: {
          fullName: 'John Customer',
          phone: '08012345678',
          email: 'customer@example.com',
          profileStatus: 'ACTIVE',
        },
      },
    },
    include: { customerProfile: true },
  });

  // --- Store ---
  const mainStore = await prisma.store.upsert({
    where: { id: 'store-RE' },
    update: {
      name: 'Main Store',
      managerId: manager.id,
      isMain: true,
    },
    create: {
      id: 'store-RE',
      name: 'Main Store',
      isMain: true,
      managerId: manager.id,
    },
  });
  await prisma.legacyStoreMapping.upsert({
    where: { storeCode: 'RE' },
    update: { storeId: mainStore.id },
    create: { storeCode: 'RE', storeId: mainStore.id },
  });

  await seedVariantsFromCsv();

  // --- Sample variant for smoke tests ---
  const variant = await prisma.productVariant.upsert({
    where: { barcode: 'GOLD-24-EDP-100ML' },
    update: {
      name: '24 Gold Elixir EDP 100ml',
      legacyArticleCode: 'demo-variant',
      price: 20000,
      resellerPrice: 18000,
      productId: null,
    },
    create: {
      legacyArticleCode: 'demo-variant',
      name: '24 Gold Elixir EDP 100ml',
      barcode: 'GOLD-24-EDP-100ML',
      price: 20000,
      resellerPrice: 18000,
      productId: null,
    },
  });

  // Seed tier prices for the variant for testing
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: {
        productVariantId: variant.id,
        tier: UserTier.BRONZE,
      },
    },
    update: { price: 17500 },
    create: {
      productVariantId: variant.id,
      tier: UserTier.BRONZE,
      price: 17500,
    },
  });
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: {
        productVariantId: variant.id,
        tier: UserTier.SILVER,
      },
    },
    update: { price: 17000 },
    create: {
      productVariantId: variant.id,
      tier: UserTier.SILVER,
      price: 17000,
    },
  });
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: {
        productVariantId: variant.id,
        tier: UserTier.GOLD,
      },
    },
    update: { price: 16500 },
    create: { productVariantId: variant.id, tier: UserTier.GOLD, price: 16500 },
  });
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: {
        productVariantId: variant.id,
        tier: UserTier.PLATINUM,
      },
    },
    update: { price: 16000 },
    create: {
      productVariantId: variant.id,
      tier: UserTier.PLATINUM,
      price: 16000,
    },
  });

  await prisma.stock.upsert({
    where: {
      storeId_productVariantId: {
        storeId: mainStore.id,
        productVariantId: variant.id,
      },
    },
    update: {
      quantity: 100,
    },
    create: {
      storeId: mainStore.id,
      productVariantId: variant.id,
      quantity: 100,
      reserved: 0,
    },
  });

  console.log('✨ Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
