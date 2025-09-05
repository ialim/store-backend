import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffResolver } from './staff.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [StaffService, StaffResolver, PrismaService],
})
export class StaffModule {}
