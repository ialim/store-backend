import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationOutboxHandler } from '../handlers/notification-outbox.handler';
import { PurchaseOutboxHandler } from '../handlers/purchase-outbox.handler';

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private readonly intervalMs = 5000;
  private readonly batchSize = 20;

  constructor(
    private prisma: PrismaService,
    private notificationHandler: NotificationOutboxHandler,
    private purchaseHandler: PurchaseOutboxHandler,
  ) {}

  onModuleInit() {
    this.start();
  }

  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.timer) return; // already running
    // Simple polling loop; replace with scheduler/queue as needed
    this.timer = setInterval(
      () => this.tick().catch(() => {}),
      this.intervalMs,
    );
    this.logger.log(`Outbox dispatcher started (every ${this.intervalMs}ms)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.logger.log('Outbox dispatcher stopped');
    }
  }

  restart() {
    this.stop();
    this.start();
    this.logger.log('Outbox dispatcher restarted');
  }

  private async tick() {
    const now = new Date();
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING' as any,
        OR: [{ deliverAfter: null }, { deliverAfter: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: this.batchSize,
    });
    if (!events.length) return;

    for (const evt of events) {
      try {
        let handled = false;
        // Notification handler: create Notification records for payload.notifications
        handled = (await this.notificationHandler.tryHandle(evt)) || handled;
        // Purchase handler: log & future analytics
        handled = (await this.purchaseHandler.tryHandle(evt)) || handled;

        if (!handled) {
          // Nothing to do for this event; mark as published to avoid reprocessing
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: { status: 'PUBLISHED' as any },
          });
          continue;
        }

        await this.prisma.outboxEvent.update({
          where: { id: evt.id },
          data: { status: 'PUBLISHED' as any, lastError: null },
        });
      } catch (err: any) {
        this.logger.error(
          `Outbox event ${evt.id} failed: ${err?.message || err}`,
        );
        await this.prisma.outboxEvent.update({
          where: { id: evt.id },
          data: {
            status: 'FAILED' as any,
            retryCount: { increment: 1 } as any,
            lastError: String(err?.message || err),
            // backoff: 1m per retry up to 10m
            deliverAfter: new Date(
              Date.now() + Math.min((evt.retryCount + 1) * 60_000, 600_000),
            ),
          },
        });
      }
    }
  }
}
