import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FulfillmentRiderInterestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

const EXPIRY_CRON =
  process.env.RIDER_INTEREST_EXPIRY_CRON ?? CronExpression.EVERY_10_MINUTES;

@Injectable()
export class RiderInterestExpiryService {
  private readonly logger = new Logger(RiderInterestExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  @Cron(EXPIRY_CRON)
  async handleCron() {
    try {
      const expired = await this.expireStaleInterests();
      if (expired > 0) {
        this.logger.log(`Expired ${expired} rider interest(s).`);
      }
    } catch (error) {
      this.logger.error('Failed to expire rider interests', error as Error);
    }
  }

  async expireStaleInterests(limit?: number): Promise<number> {
    const fallbackMinutesSetting = await this.systemSettings.getNumber(
      'RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES',
    );
    const batchSizeSetting = await this.systemSettings.getNumber(
      'RIDER_INTEREST_EXPIRY_BATCH_SIZE',
    );
    const fallbackMinutes =
      fallbackMinutesSetting != null && fallbackMinutesSetting > 0
        ? fallbackMinutesSetting
        : null;
    const batchSize =
      limit && limit > 0 ? Math.min(limit, batchSizeSetting) : batchSizeSetting;
    if (!batchSize || batchSize <= 0) {
      this.logger.debug('Rider interest expiry disabled: invalid batch size.');
      return 0;
    }
    const now = new Date();
    const fallbackCutoff =
      fallbackMinutes != null && fallbackMinutes > 0
        ? new Date(Date.now() - fallbackMinutes * 60 * 1000)
        : null;

    const clauses: Prisma.FulfillmentRiderInterestWhereInput[] = [
      { expiresAt: { not: null, lt: now } },
    ];
    if (fallbackCutoff) {
      clauses.push({ expiresAt: null, createdAt: { lt: fallbackCutoff } });
    }

    const staleInterests = await this.prisma.fulfillmentRiderInterest.findMany({
      where: {
        status: FulfillmentRiderInterestStatus.ACTIVE,
        OR: clauses,
      },
      include: {
        fulfillment: {
          select: {
            saleOrderId: true,
            saleOrder: { select: { billerId: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (!staleInterests.length) {
      return 0;
    }

    let processed = 0;

    for (const interest of staleInterests) {
      try {
        const result = await this.prisma.$transaction(async (trx) => {
          const fresh = await trx.fulfillmentRiderInterest.findUnique({
            where: {
              fulfillmentId_riderId: {
                fulfillmentId: interest.fulfillmentId,
                riderId: interest.riderId,
              },
            },
            select: {
              status: true,
              fulfillmentId: true,
              riderId: true,
              fulfillment: {
                select: {
                  saleOrderId: true,
                  saleOrder: { select: { billerId: true } },
                },
              },
            },
          });

          if (
            !fresh ||
            fresh.status !== FulfillmentRiderInterestStatus.ACTIVE
          ) {
            return null;
          }

          await trx.fulfillmentRiderInterest.update({
            where: {
              fulfillmentId_riderId: {
                fulfillmentId: interest.fulfillmentId,
                riderId: interest.riderId,
              },
            },
            data: { status: FulfillmentRiderInterestStatus.EXPIRED },
          });

          return {
            riderId: fresh.riderId,
            saleOrderId: fresh.fulfillment.saleOrderId,
            billerId: fresh.fulfillment.saleOrder?.billerId ?? null,
          };
        });

        if (!result) continue;

        await Promise.all([
          this.notifications.createNotification(
            result.riderId,
            'RIDER_INTEREST_EXPIRED',
            `Your interest for order ${result.saleOrderId} expired.`,
          ),
          result.billerId
            ? this.notifications.createNotification(
                result.billerId,
                'RIDER_INTEREST_EXPIRED',
                `Rider interest expired for order ${result.saleOrderId}.`,
              )
            : Promise.resolve(),
        ]);

        processed += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to expire rider interest ${interest.fulfillmentId}/${interest.riderId}: ${(error as Error).message}`,
        );
      }
    }

    return processed;
  }
}
