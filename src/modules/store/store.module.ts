import { Module } from '@nestjs/common';
import { StoresResolver } from './store.resolver';
import { StoreService } from './store.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [StoreService, StoresResolver, PrismaService, NotificationService],
})
export class StoreModule {}
