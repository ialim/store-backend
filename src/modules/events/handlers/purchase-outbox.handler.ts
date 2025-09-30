import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

const parsePurchasePayload = (
  payload: Prisma.JsonValue | null | undefined,
): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') return {};
  return payload as Record<string, unknown>;
};

@Injectable()
export class PurchaseOutboxHandler {
  private readonly logger = new Logger(PurchaseOutboxHandler.name);
  constructor(private prisma: PrismaService) {}

  async tryHandle(event: {
    id: string;
    type: string;
    payload: Prisma.JsonValue | null | undefined;
  }): Promise<boolean> {
    const t = event.type || '';
    if (
      t.startsWith('PURCHASE_') ||
      t.startsWith('RFQ_') ||
      t.startsWith('SUPPLIER_QUOTE_')
    ) {
      // Persist lightweight audit event
      try {
        const payloadRecord = parsePurchasePayload(event.payload);
        const aggregateType =
          typeof payloadRecord.aggregateType === 'string'
            ? payloadRecord.aggregateType
            : undefined;
        const aggregateId =
          typeof payloadRecord.aggregateId === 'string'
            ? payloadRecord.aggregateId
            : undefined;
        await this.prisma.procurementEvent.create({
          data: {
            type: t,
            aggregateType,
            aggregateId,
            payload:
              (event.payload as Prisma.InputJsonValue | undefined) ??
              Prisma.JsonNull,
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to persist ProcurementEvent for ${t}: ${e}`);
      }
      this.logger.log(`Purchase event ${t}`);
      return true;
    }
    return false;
  }
}
