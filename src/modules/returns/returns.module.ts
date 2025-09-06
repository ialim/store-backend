import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsResolver } from './returns.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationModule, EventsModule],
  providers: [ReturnsService, ReturnsResolver, PrismaService],
})
export class ReturnsModule {}

