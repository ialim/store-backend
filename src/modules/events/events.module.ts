import { Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { NotificationOutboxHandler } from './handlers/notification-outbox.handler';
import { PurchaseOutboxHandler } from './handlers/purchase-outbox.handler';

@Module({
  providers: [
    DomainEventsService,
    OutboxDispatcherService,
    NotificationOutboxHandler,
    PurchaseOutboxHandler,
  ],
  exports: [DomainEventsService],
})
export class EventsModule {}
