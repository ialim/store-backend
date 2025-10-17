import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import {
  AddressResolver,
  AddressAssignmentsResolver,
  AddressFieldResolver,
} from './address.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { GEOCODING_PROVIDER } from './geocoding/geocoding.provider';
import { LocationIqProvider } from './geocoding/locationiq.provider';
import { AddressRefreshService } from './address-refresh.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [AuthModule, SystemSettingsModule],
  providers: [
    PrismaService,
    AddressService,
    AddressResolver,
    AddressAssignmentsResolver,
    AddressFieldResolver,
    AddressRefreshService,
    {
      provide: GEOCODING_PROVIDER,
      useClass: LocationIqProvider,
    },
  ],
  exports: [AddressService],
})
export class AddressModule {}
