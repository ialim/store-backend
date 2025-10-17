import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsResolver } from './system-settings.resolver';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SystemSettingsService, SystemSettingsResolver],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
