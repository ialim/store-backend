import { Module } from '@nestjs/common';
import { SalesResolver } from './sale.resolver';
import { SalesService } from './sale.service';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationModule, AuthModule, EventsModule, PaymentModule],
  providers: [SalesResolver, SalesService],
  exports: [SalesService],
})
export class SaleModule {}
