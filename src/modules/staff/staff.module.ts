import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffResolver } from './staff.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [NotificationModule, VerificationModule],
  providers: [StaffService, StaffResolver, PrismaService],
})
export class StaffModule {}
