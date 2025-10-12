import { Module } from '@nestjs/common';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { NotificationModule } from '../notification/notification.module';
import { SaleModule } from '../sale/sale.module';
import { SaleOrderResolver } from './sale-order.resolver';
import { FulfillmentResolver } from './fulfillment.resolver';

@Module({
  imports: [NotificationModule, SaleModule],
  providers: [
    OrderResolver,
    OrderService,
    SaleOrderResolver,
    FulfillmentResolver,
  ],
  exports: [OrderService],
})
export class OrderModule {}
