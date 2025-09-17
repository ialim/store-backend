import { Injectable } from '@nestjs/common';
import { Prisma, SupportMessage } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEventsService } from '../events/services/domain-events.service';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private domainEvents: DomainEventsService,
  ) {}

  async sendFromUser(userId: string, message: string) {
    const msg = await this.prisma.supportMessage.create({
      data: { userId, isAdmin: false, message },
    });
    const admins = await this.prisma.user.findMany({
      where: { role: { name: { in: ['SUPERADMIN', 'ADMIN', 'MANAGER'] } } },
      select: { id: true },
    });
    if (admins.length) {
      await this.domainEvents.publish(
        'NOTIFICATION',
        {
          notifications: admins.map((a) => ({
            userId: a.id,
            type: 'SUPPORT_MESSAGE',
            message: `New support message from user ${userId}`,
          })),
        },
        { aggregateType: 'Notification' },
      );
    }
    return msg;
  }

  async sendFromAdmin(targetUserId: string, adminId: string, message: string) {
    const msg = await this.prisma.supportMessage.create({
      data: { userId: targetUserId, isAdmin: true, message },
    });
    await this.domainEvents.publish(
      'NOTIFICATION',
      {
        notifications: [
          {
            userId: targetUserId,
            type: 'SUPPORT_REPLY',
            message: 'You have a new support reply',
          },
        ],
      },
      { aggregateType: 'Notification' },
    );
    const afterChange: Prisma.JsonObject = { message };
    const beforeChange: Prisma.NullableJsonNullValueInput = Prisma.JsonNull;
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'SUPPORT_REPLY',
        entityType: 'SupportMessage',
        entityId: msg.id,
        beforeChange,
        afterChange,
      },
    });
    return msg;
  }

  async myMessages(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async conversation(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async recentThreads(limit = 20): Promise<SupportMessage[]> {
    const latest = await this.prisma.supportMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: limit,
    });
    const users = latest.map((entry) => entry.userId);
    if (!users.length) return [];
    const messages = await this.prisma.supportMessage.findMany({
      where: { userId: { in: users } },
      orderBy: { createdAt: 'desc' },
    });
    const byUser = new Map<string, SupportMessage>();
    for (const message of messages) {
      if (!byUser.has(message.userId)) byUser.set(message.userId, message);
    }
    return users
      .map((userId) => byUser.get(userId))
      .filter((message): message is SupportMessage => Boolean(message));
  }
}
