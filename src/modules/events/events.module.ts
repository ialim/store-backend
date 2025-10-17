import { Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { NotificationOutboxHandler } from './handlers/notification-outbox.handler';
import { PurchaseOutboxHandler } from './handlers/purchase-outbox.handler';
import { PaymentsOutboxHandler } from './handlers/payments-outbox.handler';
import { EventsResolver } from './events.resolver';
import { OutboxSchedulerService } from './services/outbox-scheduler.service';
import { PhaseCoordinator } from '../../state/phase-coordinator';
import { WorkflowService } from '../../state/workflow.service';

@Module({
  providers: [
    DomainEventsService,
    OutboxDispatcherService,
    NotificationOutboxHandler,
    PurchaseOutboxHandler,
    PaymentsOutboxHandler,
    PhaseCoordinator,
    WorkflowService,
    EventsResolver,
    OutboxSchedulerService,
  ],
  exports: [
    DomainEventsService,
    PhaseCoordinator,
    WorkflowService,
    PaymentsOutboxHandler,
  ],
})
export class EventsModule {}
