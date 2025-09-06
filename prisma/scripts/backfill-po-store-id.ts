import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pos = await prisma.purchaseOrder.findMany({ where: { storeId: null as any } });
  console.log(`Found ${pos.length} purchase orders missing storeId...`);
  let updated = 0;
  for (const po of pos) {
    const receipt = await prisma.stockReceiptBatch.findFirst({
      where: { purchaseOrderId: po.id },
      orderBy: { receivedAt: 'asc' },
    });
    if (receipt?.storeId) {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { storeId: receipt.storeId },
      });
      updated += 1;
    }
  }
  console.log(`Backfill complete. Updated ${updated} purchase orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

