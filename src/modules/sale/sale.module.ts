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

@Module({
  imports: [
    NotificationModule,
    AuthModule,
    EventsModule,
    PaymentModule,
    AnalyticsModule,
  ],
  providers: [SalesResolver, SalesService, PrismaService, WorkflowService],
  exports: [SalesService],
})
export class SaleModule {}
