import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SalesService } from '../src/modules/sale/sale.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const sales = app.get(SalesService);
    const prisma = app.get(PrismaService);

    const orders = await prisma.saleOrder.findMany({
      select: {
        id: true,
        workflowState: true,
        workflowContext: true,
      },
    });

    let ordersUpdated = 0;
    for (const order of orders) {
      const needsContext = !order.workflowContext;
      const needsState = !order.workflowState;
      if (!needsContext && !needsState) continue;

      const snapshot = await sales.getSaleWorkflowSnapshot(order.id);
      const updateData: {
        workflowState?: string | null;
        workflowContext?: unknown;
      } = {};
      if (needsState) {
        updateData.workflowState = snapshot.state;
      }
      if (needsContext) {
        updateData.workflowContext = snapshot.context;
      }
      if (Object.keys(updateData).length) {
        await prisma.saleOrder.update({
          where: { id: order.id },
          data: updateData,
        });
        ordersUpdated += 1;
      }
    }

    const fulfilments = await prisma.fulfillment.findMany({
      select: {
        id: true,
        saleOrderId: true,
        workflowState: true,
        workflowContext: true,
      },
    });

    let fulfilmentsUpdated = 0;
    for (const fulfilment of fulfilments) {
      const needsContext = !fulfilment.workflowContext;
      const needsState = !fulfilment.workflowState;
      if (!needsContext && !needsState) continue;

      const snapshot = await sales.getFulfilmentWorkflowSnapshot(
        fulfilment.saleOrderId,
      );
      if (!snapshot) continue;

      const updateData: {
        workflowState?: string | null;
        workflowContext?: unknown;
      } = {};
      if (needsState) {
        updateData.workflowState = snapshot.state;
      }
      if (needsContext) {
        updateData.workflowContext = snapshot.context;
      }
      if (Object.keys(updateData).length) {
        await prisma.fulfillment.update({
          where: { id: fulfilment.id },
          data: updateData,
        });
        fulfilmentsUpdated += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `Backfill complete. Updated ${ordersUpdated} sale orders and ${fulfilmentsUpdated} fulfilments.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Backfill failed', error);
  process.exit(1);
});
