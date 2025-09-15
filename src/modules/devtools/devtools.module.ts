import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DevToolsResolver } from './devtools.resolver';

@Module({
  providers: [PrismaService, DevToolsResolver],
})
export class DevToolsModule {}

