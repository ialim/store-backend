import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PurchaseOutboxHandler {
  private readonly logger = new Logger(PurchaseOutboxHandler.name);
  constructor(private prisma: PrismaService) {}

  async tryHandle(event: {
    id: string;
    type: string;
    payload: any;
  }): Promise<boolean> {
    const t = event.type || '';
    if (
      t.startsWith('PURCHASE_') ||
      t.startsWith('RFQ_') ||
      t.startsWith('SUPPLIER_QUOTE_')
    ) {
      // Persist lightweight audit event
      try {
        await this.prisma.procurementEvent.create({
          data: {
            type: t,
            aggregateType: event.payload?.aggregateType || undefined,
            aggregateId: event.payload?.aggregateId || undefined,
            payload: event.payload ?? {},
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
