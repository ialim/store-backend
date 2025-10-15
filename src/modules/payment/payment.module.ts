import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';
import { PaymentWebhookController } from './payment-webhook.controller';

@Module({
  imports: [NotificationModule, EventsModule, AuthModule],
  controllers: [PaymentWebhookController],
  providers: [PaymentService, PaymentResolver],
  exports: [PaymentService],
})
export class PaymentModule {}
