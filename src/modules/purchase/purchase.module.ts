import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseResolver } from './purchase.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationModule, EventsModule, PaymentModule],
  providers: [PurchaseService, PurchaseResolver, PrismaService],
})
export class PurchaseModule {}
