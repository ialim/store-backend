import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEventsService } from '../events/services/domain-events.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private domainEvents: DomainEventsService,
  ) {}

  async createNotification(userId: string, type: string, message: string) {
    // Publish via outbox; NotificationOutboxHandler writes the Notification row
    await this.domainEvents.publish(
      'NOTIFICATION',
      {
        notifications: [
          {
            userId,
            type,
            message,
          },
        ],
      },
      { aggregateType: 'Notification', aggregateId: undefined },
    );
    // No immediate DB write; return a synthetic object shape to preserve call sites
    return { userId, type, message } as any;
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
