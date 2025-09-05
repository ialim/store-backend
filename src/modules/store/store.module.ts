import { Module } from '@nestjs/common';
import { StoresResolver } from './store.resolver';
import { StoreService } from './store.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [StoreService, StoresResolver, PrismaService],
})
export class StoreModule {}
