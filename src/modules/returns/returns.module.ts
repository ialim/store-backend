import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsResolver } from './returns.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';
import { PaymentModule } from '../payment/payment.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [NotificationModule, EventsModule, PaymentModule, AnalyticsModule],
  providers: [ReturnsService, ReturnsResolver, PrismaService],
})
export class ReturnsModule {}
