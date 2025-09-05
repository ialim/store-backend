import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseResolver } from './purchase.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [
    PurchaseService,
    PurchaseResolver,
    PrismaService,
  ],
})
export class PurchaseModule {}
