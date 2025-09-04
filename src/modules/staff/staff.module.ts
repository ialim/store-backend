import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffResolver } from './staff.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [StaffService, StaffResolver, PrismaService, NotificationService],
})
export class StaffModule {}
