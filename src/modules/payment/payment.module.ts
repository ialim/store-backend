import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationModule, EventsModule],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

