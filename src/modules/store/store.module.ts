import { Module } from '@nestjs/common';
import { StoresResolver } from './store.resolver';
import { StoreService } from './store.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [NotificationModule, AuthModule],
  providers: [StoreService, StoresResolver, PrismaService],
})
export class StoreModule {}
