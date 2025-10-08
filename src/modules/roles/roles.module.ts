import { Module } from '@nestjs/common';
import { RolesResolver } from './roles.resolver';
import { RolesService } from './roles.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  providers: [RolesResolver, RolesService, PrismaService],
})
export class RolesModule {}
