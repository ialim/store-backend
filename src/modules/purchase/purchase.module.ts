import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseResolver } from './purchase.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [],
  providers: [
    PurchaseService,
    PurchaseResolver,
    PrismaService,
    NotificationService,
  ],
})
export class PurchaseModule {}
