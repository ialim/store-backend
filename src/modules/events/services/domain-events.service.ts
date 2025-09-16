import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type DomainEventPayload = Record<string, any>;

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  constructor(private prisma: PrismaService) {}

  async publish(
    type: string,
    payload: DomainEventPayload,
    options?: {
      aggregateType?: string;
      aggregateId?: string;
      deliverAfter?: Date | null;
      tx?: Prisma.TransactionClient;
    },
  ) {
    const data = {
      type,
      aggregateType: options?.aggregateType,
      aggregateId: options?.aggregateId,
      payload,
      deliverAfter: options?.deliverAfter ?? null,
    };
    // If a transaction client is provided, use it
    try {
      if (options?.tx) {
        return await options.tx.outboxEvent.create({ data });
      }
    } catch (e) {
      this.logger.warn('Falling back to default prisma client for outbox insert');
    }
    return await this.prisma.outboxEvent.create({ data });
  }
}
