import { PrismaClient, UserTier, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  ALL_PERMISSION_NAMES,
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  PermissionName,
} from '../shared/permissions';

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

async function seedVariantsFromCsv(options: {
  mainStoreId: string;
}): Promise<void> {
  const rows = parseVariantsCsv();
  if (!rows.length) {
    console.log(
      'No variant rows found in variants.csv, skipping CSV-based seeding.',
    );
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
      ? await prisma.productVariant.findFirst({
          where: { OR: variantMatchClauses },
        })
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

    const warehouseCode = (row.warehouseCode || 'RE').trim().toUpperCase();
    if (warehouseCode === 'RE') {
      const quantity =
        row.stockQuantity != null ? Math.round(row.stockQuantity) : 0;
      await prisma.stock.upsert({
        where: {
          storeId_productVariantId: {
            storeId: options.mainStoreId,
            productVariantId: variant.id,
          },
        },
        update: { quantity },
        create: {
          storeId: options.mainStoreId,
          productVariantId: variant.id,
          quantity,
          reserved: 0,
        },
      });
    }
  }

  console.log(`Seeded ${rows.length} variants from variants.csv`);
}

async function main() {
  // --- Permissions ---
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        module: perm.module,
        action: perm.action,
      },
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
  const permByName = new Map(allPerms.map((perm) => [perm.name, perm.id]));

  const rolePermissions: Record<string, PermissionName[]> = {
    SUPERADMIN: [...ALL_PERMISSION_NAMES],
    ADMIN: [
      PERMISSIONS.user.CREATE,
      PERMISSIONS.user.READ,
      PERMISSIONS.user.UPDATE,
      PERMISSIONS.user.DELETE,
      PERMISSIONS.analytics.READ,
      PERMISSIONS.resellerProfile.READ,
      PERMISSIONS.resellerProfile.UPDATE,
      PERMISSIONS.resellerProfile.APPROVE,
      PERMISSIONS.customerProfile.READ,
      PERMISSIONS.customerProfile.UPDATE,
      PERMISSIONS.role.READ,
      PERMISSIONS.store.CREATE,
      PERMISSIONS.store.READ,
      PERMISSIONS.store.UPDATE,
      PERMISSIONS.store.DELETE,
      PERMISSIONS.store.APPROVE,
      PERMISSIONS.stock.READ,
      PERMISSIONS.stock.UPDATE,
      PERMISSIONS.purchase.CREATE,
      PERMISSIONS.purchase.READ,
      PERMISSIONS.purchase.UPDATE,
      PERMISSIONS.purchase.APPROVE,
      PERMISSIONS.payment.READ,
      PERMISSIONS.event.READ,
      PERMISSIONS.event.UPDATE,
      PERMISSIONS.sale.CREATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.sale.APPROVE,
      PERMISSIONS.order.CREATE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
      PERMISSIONS.order.APPROVE,
      PERMISSIONS.return.CREATE,
      PERMISSIONS.return.READ,
      PERMISSIONS.return.UPDATE,
      PERMISSIONS.asset.CREATE,
      PERMISSIONS.asset.READ,
      PERMISSIONS.asset.UPDATE,
      PERMISSIONS.asset.DELETE,
      PERMISSIONS.devtool.READ,
      PERMISSIONS.devtool.UPDATE,
      PERMISSIONS.support.READ,
      PERMISSIONS.support.UPDATE,
    ].filter(Boolean) as PermissionName[],
    ACCOUNTANT: [
      PERMISSIONS.analytics.READ,
      PERMISSIONS.payment.READ,
      PERMISSIONS.event.READ,
      PERMISSIONS.event.UPDATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.sale.APPROVE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
      PERMISSIONS.order.APPROVE,
      PERMISSIONS.return.READ,
      PERMISSIONS.return.UPDATE,
      PERMISSIONS.asset.READ,
    ].filter(Boolean) as PermissionName[],
    BILLER: [
      PERMISSIONS.resellerProfile.CREATE,
      PERMISSIONS.resellerProfile.READ,
      PERMISSIONS.resellerProfile.UPDATE,
      PERMISSIONS.customerProfile.READ,
      PERMISSIONS.customerProfile.UPDATE,
      PERMISSIONS.sale.CREATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.sale.APPROVE,
      PERMISSIONS.order.CREATE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
    ].filter(Boolean) as PermissionName[],
    MANAGER: [
      PERMISSIONS.store.READ,
      PERMISSIONS.store.UPDATE,
      PERMISSIONS.store.APPROVE,
      PERMISSIONS.resellerProfile.READ,
      PERMISSIONS.resellerProfile.UPDATE,
      PERMISSIONS.resellerProfile.APPROVE,
      PERMISSIONS.stock.READ,
      PERMISSIONS.stock.UPDATE,
      PERMISSIONS.purchase.READ,
      PERMISSIONS.purchase.UPDATE,
      PERMISSIONS.purchase.APPROVE,
      PERMISSIONS.payment.READ,
      PERMISSIONS.event.READ,
      PERMISSIONS.event.UPDATE,
      PERMISSIONS.sale.CREATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.sale.APPROVE,
      PERMISSIONS.order.CREATE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
      PERMISSIONS.order.APPROVE,
      PERMISSIONS.return.READ,
      PERMISSIONS.return.UPDATE,
      PERMISSIONS.asset.CREATE,
      PERMISSIONS.asset.READ,
      PERMISSIONS.asset.UPDATE,
      PERMISSIONS.asset.DELETE,
      PERMISSIONS.support.READ,
      PERMISSIONS.support.UPDATE,
    ].filter(Boolean) as PermissionName[],
    RESELLER: [
      PERMISSIONS.resellerProfile.READ,
      PERMISSIONS.customerProfile.READ,
      PERMISSIONS.sale.CREATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.order.CREATE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
      PERMISSIONS.return.READ,
    ].filter(Boolean) as PermissionName[],
    CUSTOMER: [
      PERMISSIONS.customerProfile.READ,
      PERMISSIONS.sale.CREATE,
      PERMISSIONS.sale.READ,
      PERMISSIONS.sale.UPDATE,
      PERMISSIONS.order.CREATE,
      PERMISSIONS.order.READ,
      PERMISSIONS.order.UPDATE,
    ].filter(Boolean) as PermissionName[],
  };

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const connect = permissionNames
      .map((permissionName) => permByName.get(permissionName))
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id }));

    await prisma.role.update({
      where: { name: roleName },
      data: {
        permissions: {
          set: [],
          connect,
        },
      },
    });
  }

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

  if ((process.env.SEED_VARIANTS_FROM_CSV ?? '').toLowerCase() === 'true') {
    await seedVariantsFromCsv({ mainStoreId: mainStore.id });
  } else {
    console.log(
      'Skipping CSV variant seeding (SEED_VARIANTS_FROM_CSV is not true).',
    );
  }

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

  await prisma.stock.upsert({
    where: {
      storeId_productVariantId: {
        storeId: mainStore.id,
        productVariantId: variant.id,
      },
    },
    update: { quantity: 100 },
    create: {
      storeId: mainStore.id,
      productVariantId: variant.id,
      quantity: 100,
      reserved: 0,
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
