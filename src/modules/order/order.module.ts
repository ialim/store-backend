import { Module } from '@nestjs/common';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { NotificationModule } from '../notification/notification.module';
import { SaleModule } from '../sale/sale.module';

@Module({
  imports: [NotificationModule, SaleModule],
  providers: [OrderResolver, OrderService],
  exports: [OrderService],
})
export class OrderModule {}
