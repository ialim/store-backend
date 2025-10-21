import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

type NotificationPayload = {
  notifications?: Array<{
    userId: string;
    type: string;
    message: string;
  }>;
  [k: string]: any;
};

@Injectable()
export class NotificationOutboxHandler {
  private readonly logger = new Logger(NotificationOutboxHandler.name);

  constructor(private prisma: PrismaService) {}

  async tryHandle(event: {
    id: string;
    type: string;
    payload: any;
  }): Promise<boolean> {
    const payload = event.payload as NotificationPayload;
    const notifications = payload?.notifications ?? [];
    if (!notifications.length) {
      return false;
    }

    const uniqueUserIds = Array.from(
      new Set(
        notifications
          .map((n) => n.userId)
          .filter((userId): userId is string => !!userId),
      ),
    );

    let validUserIds = new Set<string>();
    if (uniqueUserIds.length) {
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true },
      });
      validUserIds = new Set(existingUsers.map((user) => user.id));
    }

    for (const n of notifications) {
      if (!n.userId || !validUserIds.has(n.userId)) {
        this.logger.warn(
          `Skipping notification for missing user ${n.userId ?? 'unknown'} (event ${event.id})`,
        );
        continue;
      }
      await this.prisma.notification.create({
        data: { userId: n.userId, type: n.type, message: n.message },
      });
    }
    return true;
  }
}
