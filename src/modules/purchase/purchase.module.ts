import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseResolver } from './purchase.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';
import { PaymentModule } from '../payment/payment.module';
import { LowStockSchedulerService } from './low-stock-scheduler.service';
import { InvoiceIngestResolver } from './invoice-ingest.resolver';
import { InvoiceIngestService } from './invoice-ingest.service';
import { InvoiceImportResolver } from './invoice-import.resolver';
import { InvoiceImportQueue } from './invoice-import.queue';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [NotificationModule, EventsModule, PaymentModule, StockModule],
  providers: [PurchaseService, PurchaseResolver, PrismaService, LowStockSchedulerService, InvoiceIngestResolver, InvoiceIngestService, InvoiceImportResolver, InvoiceImportQueue],
})
export class PurchaseModule {}
