import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rider coverage areas…');

  const riderRole = await prisma.role.upsert({
    where: { name: 'RIDER' },
    update: {},
    create: {
      name: 'RIDER',
      description: 'Operational rider able to volunteer for deliveries.',
    },
    select: { id: true },
  });

  const riders = await prisma.user.findMany({
    where: { roleId: riderRole.id },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

  let workingRiders = riders;

  if (!workingRiders.length) {
    console.log('ℹ️ No riders found. Creating sample rider accounts…');
    const sampleRiders = [
      {
        email: 'rider.one@example.com',
        password: 'Password123!',
      },
      {
        email: 'rider.two@example.com',
        password: 'Password123!',
      },
    ];

    const createdRiders = [];

    for (const sample of sampleRiders) {
      const existing = await prisma.user.findUnique({
        where: { email: sample.email },
        select: { id: true, roleId: true },
      });
      if (existing && existing.roleId !== riderRole.id) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { roleId: riderRole.id },
        });
        createdRiders.push({ id: existing.id, email: sample.email });
        continue;
      }
      if (!existing) {
        const passwordHash = await bcrypt.hash(sample.password, 10);
        const created = await prisma.user.create({
          data: {
            email: sample.email,
            passwordHash,
            roleId: riderRole.id,
          },
          select: { id: true, email: true },
        });
        createdRiders.push(created);
      }
    }

    workingRiders = createdRiders;
    console.log(
      `✅ Seeded ${createdRiders.length} rider account(s) with default password "Password123!".`,
    );
  }

  const stores = await prisma.store.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!stores.length) {
    console.warn('⚠️ No stores found. Nothing to seed.');
    return;
  }

  let totalAssignments = 0;

  for (const [index, rider] of workingRiders.entries()) {
    // Give each rider coverage over up to two stores in a round-robin fashion
    const storeCount = Math.min(2, stores.length);
    const coverageEntries = new Map<string, number | null>();

    for (let offset = 0; offset < storeCount; offset += 1) {
      const store = stores[(index + offset) % stores.length];
      // Alternate between 5km and 8km radius for variety
      const radius = offset % 2 === 0 ? 5 : 8;
      coverageEntries.set(store.id, radius);
    }

    await prisma.riderCoverageArea.deleteMany({
      where: { riderId: rider.id },
    });

    if (coverageEntries.size > 0) {
      await prisma.riderCoverageArea.createMany({
        data: Array.from(coverageEntries.entries()).map(
          ([storeId, serviceRadiusKm]) => ({
            riderId: rider.id,
            storeId,
            serviceRadiusKm,
          }),
        ),
        skipDuplicates: true,
      });
    }

    totalAssignments += coverageEntries.size;
    console.log(
      `✅ Seeded ${coverageEntries.size} coverage entries for rider ${
        rider.email ?? rider.id
      }`,
    );
  }

  console.log(
    `🎉 Completed seeding coverage for ${workingRiders.length} rider(s) across ${totalAssignments} assignment(s).`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Failed to seed rider coverage areas:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
