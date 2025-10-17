import { Module } from '@nestjs/common';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { NotificationModule } from '../notification/notification.module';
import { SaleModule } from '../sale/sale.module';
import { EventsModule } from '../events/events.module';
import { SaleOrderResolver } from './sale-order.resolver';
import { FulfillmentResolver } from './fulfillment.resolver';
import { RiderInterestService } from './rider-interest.service';
import { RiderInterestResolver } from './rider-interest.resolver';
import { WorkflowService } from '../../state/workflow.service';
import { RiderInterestExpiryService } from './rider-interest-expiry.service';
import { RiderCoverageService } from './rider-coverage.service';
import { RiderCoverageResolver } from './rider-coverage.resolver';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [NotificationModule, SaleModule, EventsModule, SystemSettingsModule],
  providers: [
    OrderResolver,
    OrderService,
    SaleOrderResolver,
    FulfillmentResolver,
    RiderInterestService,
    RiderInterestResolver,
    WorkflowService,
    RiderInterestExpiryService,
    RiderCoverageService,
    RiderCoverageResolver,
  ],
  exports: [OrderService],
})
export class OrderModule {}
