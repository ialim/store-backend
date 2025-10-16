import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
  FulfillmentType,
  FulfillmentRiderInterestStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

interface RegisterInterestParams {
  fulfillmentId: string;
  riderId: string;
  etaMinutes?: number | null;
  message?: string | null;
}

@Injectable()
export class RiderInterestService {
  constructor(private readonly prisma: PrismaService) {}

  async availableDeliveriesForRider(riderId: string) {
    return this.prisma.fulfillment.findMany({
      where: {
        type: FulfillmentType.DELIVERY,
        status: FulfillmentStatus.PENDING,
        riderInterests: {
          none: {
            riderId,
            status: {
              in: [
                FulfillmentRiderInterestStatus.ACTIVE,
                FulfillmentRiderInterestStatus.ASSIGNED,
              ],
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async myInterests(riderId: string) {
    return this.prisma.fulfillmentRiderInterest.findMany({
      where: {
        riderId,
        status: {
          in: [
            FulfillmentRiderInterestStatus.ACTIVE,
            FulfillmentRiderInterestStatus.ASSIGNED,
          ],
        },
      },
      include: {
        fulfillment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForSaleOrder(saleOrderId: string) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId },
      select: { id: true, type: true },
    });
    if (!fulfillment) {
      throw new NotFoundException('Fulfillment not found');
    }
    if (fulfillment.type !== FulfillmentType.DELIVERY) {
      throw new BadRequestException('Fulfillment does not accept riders');
    }
    return this.prisma.fulfillmentRiderInterest.findMany({
      where: { fulfillmentId: fulfillment.id },
      include: {
        rider: {
          select: {
            id: true,
            email: true,
            customerProfile: true,
            resellerProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async registerInterest(params: RegisterInterestParams) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { id: params.fulfillmentId },
      select: { type: true, status: true },
    });
    if (!fulfillment) {
      throw new NotFoundException('Fulfillment not found');
    }
    if (fulfillment.type !== FulfillmentType.DELIVERY) {
      throw new BadRequestException('Only delivery fulfilments accept riders');
    }
    if (fulfillment.status !== FulfillmentStatus.PENDING) {
      throw new BadRequestException('Fulfillment is not accepting riders');
    }

    return this.prisma.fulfillmentRiderInterest.upsert({
      where: {
        fulfillmentId_riderId: {
          fulfillmentId: params.fulfillmentId,
          riderId: params.riderId,
        },
      },
      update: {
        status: FulfillmentRiderInterestStatus.ACTIVE,
        etaMinutes: params.etaMinutes ?? null,
        message: params.message ?? null,
        expiresAt: params.etaMinutes
          ? new Date(Date.now() + params.etaMinutes * 60000)
          : null,
      },
      create: {
        fulfillmentId: params.fulfillmentId,
        riderId: params.riderId,
        etaMinutes: params.etaMinutes ?? null,
        message: params.message ?? null,
        expiresAt: params.etaMinutes
          ? new Date(Date.now() + params.etaMinutes * 60000)
          : null,
      },
    });
  }

  async withdrawInterest(fulfillmentId: string, riderId: string) {
    return this.prisma.fulfillmentRiderInterest.update({
      where: {
        fulfillmentId_riderId: { fulfillmentId, riderId },
      },
      data: { status: FulfillmentRiderInterestStatus.WITHDRAWN },
    });
  }

  async assignRider(fulfillmentId: string, riderId: string) {
    return this.prisma.$transaction(async (trx) => {
      const interest = await trx.fulfillmentRiderInterest.findUnique({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
      });
      if (!interest) {
        throw new NotFoundException('Rider interest not found');
      }
      await trx.fulfillmentRiderInterest.update({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
        data: { status: FulfillmentRiderInterestStatus.ASSIGNED },
      });
      await trx.fulfillmentRiderInterest.updateMany({
        where: {
          fulfillmentId,
          riderId: { not: riderId },
          status: FulfillmentRiderInterestStatus.ACTIVE,
        },
        data: { status: FulfillmentRiderInterestStatus.REJECTED },
      });
      await trx.fulfillment.update({
        where: { id: fulfillmentId },
        data: {
          status: FulfillmentStatus.ASSIGNED,
          deliveryPersonnelId: riderId,
        },
      });
      return trx.fulfillmentRiderInterest.findUnique({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
        include: {
          rider: {
            select: {
              id: true,
              email: true,
              customerProfile: true,
              resellerProfile: true,
            },
          },
          fulfillment: true,
        },
      });
    });
  }
}
