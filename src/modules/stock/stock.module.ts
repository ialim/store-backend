import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockResolver } from './stock.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationModule, EventsModule],
  providers: [StockService, StockResolver, PrismaService],
  exports: [StockService],
})
export class StockModule {}
