import { Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { NotificationOutboxHandler } from './handlers/notification-outbox.handler';
import { PurchaseOutboxHandler } from './handlers/purchase-outbox.handler';
import { PaymentsOutboxHandler } from './handlers/payments-outbox.handler';
import { EventsResolver } from './events.resolver';

@Module({
  providers: [
    DomainEventsService,
    OutboxDispatcherService,
    NotificationOutboxHandler,
    PurchaseOutboxHandler,
    PaymentsOutboxHandler,
    EventsResolver,
  ],
  exports: [DomainEventsService],
})
export class EventsModule {}
