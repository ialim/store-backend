import { PrismaClient, UserTier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
    { name: 'ACCOUNTANT', description: 'Manage supplier payments and invoicing' },
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
  const accountantPerms = allPerms.filter((p) => ['VIEW_REPORTS'].includes(p.name));
  await prisma.role.update({
    where: { name: 'ACCOUNTANT' },
    data: { permissions: { connect: accountantPerms.map((p) => ({ id: p.id })) } },
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
    where: { id: '1', name: 'Main Store' },
    update: {},
    create: {
      name: 'Main Store',
      isMain: true,
      managerId: manager.id,
    },
  });

  // --- Product, Variant & Stock ---
  const category = await prisma.productCategory.upsert({
    where: { name: 'Designer Perfume' },
    update: {},
    create: { name: 'Designer Perfume' },
  });

  const product = await prisma.product.upsert({
    where: { id: '1', name: '24 Gold Elixir EDP' },
    update: {},
    create: {
      name: '24 Gold Elixir EDP',
      categoryId: category.id,
      barcode: 'GOLD-24-EDP',
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: { barcode: 'GOLD-24-EDP-100ML' },
    update: {},
    create: {
      productId: product.id,
      size: '100ml',
      concentration: 'EDP',
      packaging: 'Boxed',
      barcode: 'GOLD-24-EDP-100ML',
      price: 20000,
      resellerPrice: 18000,
    },
  });

  // Seed tier prices for the variant for testing
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: { productVariantId: variant.id, tier: UserTier.BRONZE },
    },
    update: { price: 17500 },
    create: { productVariantId: variant.id, tier: UserTier.BRONZE, price: 17500 },
  });
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: { productVariantId: variant.id, tier: UserTier.SILVER },
    },
    update: { price: 17000 },
    create: { productVariantId: variant.id, tier: UserTier.SILVER, price: 17000 },
  });
  await prisma.productVariantTierPrice.upsert({
    where: {
      productVariantId_tier: { productVariantId: variant.id, tier: UserTier.GOLD },
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
    create: { productVariantId: variant.id, tier: UserTier.PLATINUM, price: 16000 },
  });

  await prisma.stock.upsert({
    where: { id: `${mainStore.id}-${variant.id}` },
    update: {},
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
