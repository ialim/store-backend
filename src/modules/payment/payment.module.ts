import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationModule, EventsModule],
  providers: [PaymentService, PaymentResolver],
  exports: [PaymentService],
})
export class PaymentModule {}
