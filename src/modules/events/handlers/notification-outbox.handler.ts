import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

  async tryHandle(event: {
    id: string;
    type: string;
    payload: any;
  }): Promise<boolean> {
    const payload = event.payload as NotificationPayload;
    if (!payload?.notifications?.length) return false;
    for (const n of payload.notifications) {
      await this.prisma.notification.create({
        data: { userId: n.userId, type: n.type, message: n.message },
      });
    }
    return true;
  }
}
