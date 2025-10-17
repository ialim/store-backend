import { Module } from '@nestjs/common';
import { SalesResolver } from './sale.resolver';
import { SalesService } from './sale.service';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { PaymentModule } from '../payment/payment.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowService } from '../../state/workflow.service';
import { SaleExpiryService } from './sale-expiry.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    NotificationModule,
    AuthModule,
    EventsModule,
    PaymentModule,
    AnalyticsModule,
    SystemSettingsModule,
  ],
  providers: [
    SalesResolver,
    SalesService,
    PrismaService,
    WorkflowService,
    SaleExpiryService,
  ],
  exports: [SalesService],
})
export class SaleModule {}
