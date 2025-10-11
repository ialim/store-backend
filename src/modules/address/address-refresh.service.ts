import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AddressService } from './address.service';

const REFRESH_ENABLED = process.env.ADDRESS_REFRESH_ENABLED !== 'false';
const REFRESH_CRON = process.env.ADDRESS_REFRESH_CRON ?? CronExpression.EVERY_DAY_AT_3AM;
const REFRESH_BATCH_SIZE = Number.parseInt(
  process.env.ADDRESS_REFRESH_BATCH_SIZE ?? '20',
  10,
);
const REFRESH_MAX_AGE_DAYS = Number.parseInt(
  process.env.ADDRESS_REFRESH_MAX_AGE_DAYS ?? '30',
  10,
);

@Injectable()
export class AddressRefreshService {
  private readonly logger = new Logger(AddressRefreshService.name);

  constructor(private readonly addressService: AddressService) {}

  @Cron(REFRESH_CRON)
  async refreshAddresses(): Promise<void> {
    if (!REFRESH_ENABLED) {
      return;
    }
    try {
      const processed = await this.addressService.refreshStaleAddresses({
        limit: REFRESH_BATCH_SIZE,
        maxAgeDays: REFRESH_MAX_AGE_DAYS,
      });
      if (processed > 0) {
        this.logger.log(`Refreshed ${processed} address(es) from geocoding provider.`);
      }
    } catch (error) {
      this.logger.error('Failed to refresh addresses', error as Error);
    }
  }
}
