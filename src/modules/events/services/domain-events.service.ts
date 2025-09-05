import { Injectable, Logger } from '@nestjs/common';
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
      tx?: Parameters<PrismaService['$transaction']>[0];
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
      if (options?.tx && typeof options.tx === 'function') {
        // Not using function variant; fall back to default client
        return await this.prisma.outboxEvent.create({ data });
      } else if ((options as any)?.tx?.outboxEvent) {
        return await (options as any).tx.outboxEvent.create({ data });
      }
    } catch (e) {
      this.logger.warn('Falling back to default prisma client for outbox insert');
    }
    return this.prisma.outboxEvent.create({ data });
  }
}

