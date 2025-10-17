import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RiderCoverageArea } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

interface UpsertCoverageParams {
  riderId: string;
  coverage: Array<{
    storeId: string;
    serviceRadiusKm?: number | null;
  }>;
}

@Injectable()
export class RiderCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  async listForRider(riderId: string) {
    return this.prisma.riderCoverageArea.findMany({
      where: { riderId },
      include: {
        store: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertCoverage(
    params: UpsertCoverageParams,
  ): Promise<RiderCoverageArea[]> {
    const { riderId, coverage } = params;

    const rider = await this.prisma.user.findUnique({
      where: { id: riderId },
      select: { id: true },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const uniqueStoreIds = new Set<string>();
    for (const entry of coverage) {
      if (!entry.storeId?.trim()) {
        throw new BadRequestException(
          'storeId is required for coverage entries',
        );
      }
      if (uniqueStoreIds.has(entry.storeId)) {
        throw new BadRequestException(
          'Duplicate storeId detected in coverage entries',
        );
      }
      uniqueStoreIds.add(entry.storeId);
      if (
        entry.serviceRadiusKm != null &&
        (!Number.isFinite(entry.serviceRadiusKm) || entry.serviceRadiusKm < 0)
      ) {
        throw new BadRequestException(
          'serviceRadiusKm must be a positive number when provided',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // prune removed coverage
      await tx.riderCoverageArea.deleteMany({
        where: {
          riderId,
          storeId: { notIn: Array.from(uniqueStoreIds) },
        },
      });

      for (const entry of coverage) {
        await tx.riderCoverageArea.upsert({
          where: {
            riderId_storeId: {
              riderId,
              storeId: entry.storeId,
            },
          },
          update: {
            serviceRadiusKm: entry.serviceRadiusKm ?? null,
          },
          create: {
            riderId,
            storeId: entry.storeId,
            serviceRadiusKm: entry.serviceRadiusKm ?? null,
          },
        });
      }

      return tx.riderCoverageArea.findMany({
        where: { riderId },
        include: { store: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  }
}
