import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockResolver } from './stock.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [StockService, StockResolver, PrismaService, NotificationService],
})
export class StockModule {}
