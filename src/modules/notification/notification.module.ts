import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  providers: [NotificationService, NotificationResolver, PrismaService],
  exports: [NotificationService],
})
export class NotificationModule {}
