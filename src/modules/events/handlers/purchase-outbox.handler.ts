import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PurchaseOutboxHandler {
  private readonly logger = new Logger(PurchaseOutboxHandler.name);

  async tryHandle(event: { id: string; type: string; payload: any }): Promise<boolean> {
    const t = event.type || '';
    if (
      t.startsWith('PURCHASE_') ||
      t.startsWith('RFQ_') ||
      t.startsWith('SUPPLIER_QUOTE_')
    ) {
      // For now just log; future: write analytics or audit entries
      this.logger.log(`Purchase event ${t}: ${JSON.stringify(event.payload)}`);
      return true;
    }
    return false;
  }
}

