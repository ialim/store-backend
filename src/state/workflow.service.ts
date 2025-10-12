import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

function resolveClient(
  client: PrismaService,
  tx?: Prisma.TransactionClient,
): PrismaClientOrTx {
  return tx ?? client;
}

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async recordSaleTransition(params: {
    orderId: string;
    fromState?: string | null;
    toState: string;
    event?: string | null;
    context?: Prisma.InputJsonValue | null;
    metadata?: Prisma.InputJsonValue | null;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const { orderId, fromState, toState, event, context, metadata, tx } =
      params;
    const client = resolveClient(this.prisma, tx);

    const data: Prisma.SaleOrderUpdateInput = {
      workflowState: toState,
      workflowContext: context ?? Prisma.DbNull,
    };

    if (
      (fromState ?? null) !== toState ||
      (event && event.length) ||
      metadata
    ) {
      data.transitionLogs = {
        create: {
          fromState: fromState ?? null,
          toState,
          event: event ?? null,
          metadata: metadata ?? Prisma.DbNull,
        },
      };
    }

    await client.saleOrder.update({
      where: { id: orderId },
      data,
    });
  }

  async recordFulfilmentTransition(params: {
    fulfillmentId: string;
    fromState?: string | null;
    toState: string;
    event?: string | null;
    context?: Prisma.InputJsonValue | null;
    metadata?: Prisma.InputJsonValue | null;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const { fulfillmentId, fromState, toState, event, context, metadata, tx } =
      params;
    const client = resolveClient(this.prisma, tx);

    const data: Prisma.FulfillmentUpdateInput = {
      workflowState: toState,
      workflowContext: context ?? Prisma.DbNull,
    };

    if (
      (fromState ?? null) !== toState ||
      (event && event.length) ||
      metadata
    ) {
      data.transitionLogs = {
        create: {
          fromState: fromState ?? null,
          toState,
          event: event ?? null,
          metadata: metadata ?? Prisma.DbNull,
        },
      };
    }

    await client.fulfillment.update({
      where: { id: fulfillmentId },
      data,
    });
  }
}
