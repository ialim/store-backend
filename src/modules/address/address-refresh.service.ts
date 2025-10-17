import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AddressService } from './address.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

const REFRESH_CRON =
  process.env.ADDRESS_REFRESH_CRON ?? CronExpression.EVERY_DAY_AT_3AM;

@Injectable()
export class AddressRefreshService {
  private readonly logger = new Logger(AddressRefreshService.name);

  constructor(
    private readonly addressService: AddressService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  @Cron(REFRESH_CRON)
  async refreshAddresses(): Promise<void> {
    const enabled = await this.systemSettings.getBoolean(
      'ADDRESS_REFRESH_ENABLED',
    );
    if (!enabled) {
      return;
    }
    try {
      const batchSize = await this.systemSettings.getNumber(
        'ADDRESS_REFRESH_BATCH_SIZE',
      );
      const maxAgeDays = await this.systemSettings.getNumber(
        'ADDRESS_REFRESH_MAX_AGE_DAYS',
      );
      if (!batchSize || batchSize <= 0) {
        this.logger.debug('Address refresh skipped: invalid batch size.');
        return;
      }
      if (!maxAgeDays || maxAgeDays <= 0) {
        this.logger.debug('Address refresh skipped: invalid max age setting.');
        return;
      }
      const processed = await this.addressService.refreshStaleAddresses({
        limit: batchSize,
        maxAgeDays,
      });
      if (processed > 0) {
        this.logger.log(
          `Refreshed ${processed} address(es) from geocoding provider.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to refresh addresses', error as Error);
    }
  }
}
