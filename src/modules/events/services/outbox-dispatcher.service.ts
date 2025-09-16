import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { NotificationOutboxHandler } from '../handlers/notification-outbox.handler';
import { PurchaseOutboxHandler } from '../handlers/purchase-outbox.handler';
import { PaymentsOutboxHandler } from '../handlers/payments-outbox.handler';

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
    private paymentsHandler: PaymentsOutboxHandler,
  ) {}

  onModuleInit() {
    // Prefer scheduler-driven execution; internal polling disabled by default
    if (process.env.OUTBOX_POLLING === 'true') this.start();
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
    await this.runOnce({ limit: this.batchSize });
  }

  // Public, on-demand processing (for admin/Linux cron, testing, or replays)
  async runOnce(options?: {
    limit?: number;
    type?: string;
    status?: OutboxStatus;
  }) {
    const now = new Date();
    const baseWhere: import('@prisma/client').Prisma.OutboxEventWhereInput = {
      OR: [{ deliverAfter: null }, { deliverAfter: { lte: now } }],
    };
    if (options?.type) baseWhere.type = options.type;
    const statusFilter: OutboxStatus = options?.status ?? OutboxStatus.PENDING;

    // Claim a batch atomically by flipping to PROCESSING
    const candidates = await this.prisma.outboxEvent.findMany({
      where: { ...baseWhere, status: statusFilter },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: options?.limit ?? this.batchSize,
    });
    if (!candidates.length) return 0;
    const ids = candidates.map((c) => c.id);
    await this.prisma.outboxEvent.updateMany({
      where: { id: { in: ids }, status: statusFilter },
      data: { status: OutboxStatus.PROCESSING },
    });
    const events = await this.prisma.outboxEvent.findMany({
      where: { id: { in: ids }, status: OutboxStatus.PROCESSING },
      orderBy: { createdAt: 'asc' },
    });
    if (!events.length) return 0;

    let processed = 0;
    for (const evt of events) {
      try {
        let handled = false;
        handled = (await this.notificationHandler.tryHandle(evt)) || handled;
        handled = (await this.purchaseHandler.tryHandle(evt)) || handled;
        handled = (await this.paymentsHandler.tryHandle(evt)) || handled;

        if (!handled) {
          // Unknown type: publish with warning to avoid infinite loop
          this.logger.warn(
            `No handler for outbox type ${evt.type}; marking published.`,
          );
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: { status: OutboxStatus.PUBLISHED },
          });
          processed += 1;
          continue;
        }
        await this.prisma.outboxEvent.update({
          where: { id: evt.id },
          data: { status: OutboxStatus.PUBLISHED, lastError: null },
        });
        processed += 1;
      } catch (err: any) {
        this.logger.error(
          `Outbox event ${evt.id} failed: ${err?.message || err}`,
        );
        await this.prisma.outboxEvent.update({
          where: { id: evt.id },
          data: {
            status: OutboxStatus.FAILED,
            retryCount: { increment: 1 },
            lastError: String(err?.message || err),
            deliverAfter: new Date(
              Date.now() + Math.min((evt.retryCount + 1) * 60_000, 600_000),
            ),
          },
        });
      }
    }
    return processed;
  }
}
