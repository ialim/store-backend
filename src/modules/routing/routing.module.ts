import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingResolver } from './routing.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [RoutingService, RoutingResolver, PrismaService],
  exports: [RoutingService],
})
export class RoutingModule {}
