import { Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { NotificationOutboxHandler } from './handlers/notification-outbox.handler';

@Module({
  providers: [DomainEventsService, OutboxDispatcherService, NotificationOutboxHandler],
  exports: [DomainEventsService],
})
export class EventsModule {}

