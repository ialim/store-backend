import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { PaymentReceiptController } from './payment-receipt.controller';
import { PaymentReceiptService } from './payment-receipt.service';
import { AssetStorageService } from '../asset/asset-storage.service';

@Module({
  imports: [NotificationModule, EventsModule, AuthModule],
  controllers: [PaymentWebhookController, PaymentReceiptController],
  providers: [
    PaymentService,
    PaymentResolver,
    PaymentReceiptService,
    AssetStorageService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
