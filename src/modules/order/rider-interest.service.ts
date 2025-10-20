import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
  FulfillmentType,
  FulfillmentRiderInterestStatus,
  FulfillmentCostStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  fulfilmentStatusToState,
  FulfilState,
  FulfilmentContext,
  FulfilEvent,
  runFulfilmentMachine,
  toFulfilmentContextPayload,
} from '../../state/fulfilment.machine';
import { WorkflowService } from '../../state/workflow.service';
import { NotificationService } from '../notification/notification.service';
import { PhaseCoordinator } from '../../state/phase-coordinator';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import type { AuthenticatedUser } from '../auth/auth.service';

interface RegisterInterestParams {
  fulfillmentId: string;
  riderId: string;
  etaMinutes?: number | null;
  message?: string | null;
  proposedCost?: number | null;
}

@Injectable()
export class RiderInterestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly notifications: NotificationService,
    private readonly phaseCoordinator: PhaseCoordinator,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  private async computeExpiryDate(
    etaMinutes?: number | null,
  ): Promise<Date | null> {
    if (etaMinutes != null && Number.isFinite(etaMinutes) && etaMinutes > 0) {
      return new Date(Date.now() + etaMinutes * 60000);
    }
    const defaultExpiry = await this.systemSettings.getNumber(
      'RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES',
    );
    if (defaultExpiry != null && defaultExpiry > 0) {
      return new Date(Date.now() + defaultExpiry * 60000);
    }
    return null;
  }

  private async resolveCoverageStoreIds(
    riderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const client = tx ?? this.prisma;
    const records = await client.riderCoverageArea.findMany({
      where: { riderId },
      select: { storeId: true },
    });
    return records.map((record) => record.storeId);
  }

  private async getRiderDisplayName(riderId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: riderId },
      select: {
        email: true,
        customerProfile: { select: { fullName: true } },
        resellerProfile: { select: { userId: true } },
      },
    });
    if (!user) return riderId;
    const fullName = user.customerProfile?.fullName?.trim();
    if (fullName) return fullName;
    if (user.email) return user.email;
    if (user.resellerProfile?.userId) return user.resellerProfile.userId;
    return riderId;
  }

  private isBillerUser(user?: AuthenticatedUser | null): boolean {
    return (user?.role?.name || '').toUpperCase() === 'BILLER';
  }

  private async notify(
    userId: string | null | undefined,
    type: string,
    message: string,
  ) {
    if (!userId) return;
    await this.notifications.createNotification(userId, type, message);
  }

  async availableDeliveriesForRider(riderId: string) {
    const coverageStoreIds = await this.resolveCoverageStoreIds(riderId);

    const where: Prisma.FulfillmentWhereInput = {
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
    };

    if (coverageStoreIds.length > 0) {
      where.saleOrder = { storeId: { in: coverageStoreIds } };
    }

    return this.prisma.fulfillment.findMany({
      where,
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
            FulfillmentRiderInterestStatus.REJECTED,
            FulfillmentRiderInterestStatus.EXPIRED,
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
    const result = await this.prisma.$transaction(async (trx) => {
      const fulfillment = await trx.fulfillment.findUnique({
        where: { id: params.fulfillmentId },
        select: {
          id: true,
          saleOrderId: true,
          type: true,
          status: true,
          workflowState: true,
          workflowContext: true,
          deliveryPersonnelId: true,
          saleOrder: {
            select: {
              id: true,
              billerId: true,
              storeId: true,
            },
          },
        },
      });
      if (!fulfillment) {
        throw new NotFoundException('Fulfillment not found');
      }
      if (fulfillment.type !== FulfillmentType.DELIVERY) {
        throw new BadRequestException(
          'Only delivery fulfilments accept riders',
        );
      }
      if (fulfillment.status !== FulfillmentStatus.PENDING) {
        throw new BadRequestException('Fulfillment is not accepting riders');
      }
      if (
        params.proposedCost != null &&
        (!Number.isFinite(params.proposedCost) || params.proposedCost <= 0)
      ) {
        throw new BadRequestException(
          'Proposed cost must be a positive amount',
        );
      }

      const coverageStoreIds = await this.resolveCoverageStoreIds(
        params.riderId,
        trx,
      );
      const fulfillmentStoreId = fulfillment.saleOrder?.storeId ?? null;
      if (
        fulfillmentStoreId &&
        coverageStoreIds.length > 0 &&
        !coverageStoreIds.includes(fulfillmentStoreId)
      ) {
        throw new BadRequestException(
          'Fulfillment is outside your coverage area',
        );
      }

      const expiresAt = await this.computeExpiryDate(params.etaMinutes);
      const interest = await trx.fulfillmentRiderInterest.upsert({
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
          proposedCost: params.proposedCost ?? null,
          expiresAt,
        },
        create: {
          fulfillmentId: params.fulfillmentId,
          riderId: params.riderId,
          etaMinutes: params.etaMinutes ?? null,
          message: params.message ?? null,
          proposedCost: params.proposedCost ?? null,
          expiresAt,
        },
      });

      const previousState: FulfilState =
        (fulfillment.workflowState as FulfilState | null) ??
        fulfilmentStatusToState(fulfillment.status as FulfillmentStatus);
      if (previousState !== 'AWAITING_RIDER_SELECTION') {
        const previousContext =
          fulfillment.workflowContext &&
          typeof fulfillment.workflowContext === 'object' &&
          !Array.isArray(fulfillment.workflowContext)
            ? (fulfillment.workflowContext as unknown as FulfilmentContext)
            : undefined;
        const context = toFulfilmentContextPayload({
          ...(previousContext ?? {}),
          saleOrderId: fulfillment.saleOrderId,
        });

        await this.workflow.recordFulfilmentTransition({
          fulfillmentId: fulfillment.id,
          fromState: previousState,
          toState: 'AWAITING_RIDER_SELECTION',
          event: 'rider_selection_opened',
          context: context as Prisma.InputJsonValue,
          tx: trx,
        });
      }

      return { interest, fulfillment };
    });

    const saleOrderId = result.fulfillment.saleOrderId;
    const billerId = result.fulfillment.saleOrder?.billerId ?? null;
    const riderName = await this.getRiderDisplayName(params.riderId);

    await Promise.all([
      this.notify(
        params.riderId,
        'RIDER_INTEREST_CONFIRMED',
        `We recorded your interest for order ${saleOrderId}.`,
      ),
      billerId && billerId !== params.riderId
        ? this.notify(
            billerId,
            'RIDER_INTEREST_REGISTERED',
            `Rider ${riderName} volunteered for order ${saleOrderId}.`,
          )
        : Promise.resolve(),
    ]);

    return result.interest;
  }

  async withdrawInterest(fulfillmentId: string, riderId: string) {
    const result = await this.prisma.$transaction(async (trx) => {
      const interest = await trx.fulfillmentRiderInterest.findUnique({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
        include: {
          fulfillment: {
            select: {
              id: true,
              saleOrderId: true,
              saleOrder: { select: { id: true, billerId: true } },
            },
          },
        },
      });
      if (!interest) {
        throw new NotFoundException('Rider interest not found');
      }
      if (interest.status !== FulfillmentRiderInterestStatus.ACTIVE) {
        throw new BadRequestException('Only active interests can be withdrawn');
      }

      const updated = await trx.fulfillmentRiderInterest.update({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
        data: { status: FulfillmentRiderInterestStatus.WITHDRAWN },
      });

      return {
        updated,
        saleOrderId: interest.fulfillment.saleOrderId,
        billerId: interest.fulfillment.saleOrder?.billerId ?? null,
      };
    });

    const riderName = await this.getRiderDisplayName(riderId);

    await Promise.all([
      this.notify(
        riderId,
        'RIDER_INTEREST_WITHDRAWN',
        `You withdrew your interest for order ${result.saleOrderId}.`,
      ),
      result.billerId && result.billerId !== riderId
        ? this.notify(
            result.billerId,
            'RIDER_INTEREST_WITHDRAWN',
            `Rider ${riderName} withdrew interest for order ${result.saleOrderId}.`,
          )
        : Promise.resolve(),
    ]);

    return result.updated;
  }

  async assignRider(
    fulfillmentId: string,
    riderId: string,
    user?: AuthenticatedUser | null,
  ) {
    const result = await this.prisma.$transaction(async (trx) => {
      const fulfillment = await trx.fulfillment.findUnique({
        where: { id: fulfillmentId },
        select: {
          id: true,
          saleOrderId: true,
          type: true,
          status: true,
          workflowState: true,
          workflowContext: true,
          cost: true,
          saleOrder: {
            select: { id: true, billerId: true },
          },
        },
      });
      if (!fulfillment) {
        throw new NotFoundException('Fulfillment not found');
      }
      const billerId = fulfillment.saleOrder?.billerId ?? null;
      if (this.isBillerUser(user) && billerId && billerId !== user?.id) {
        throw new ForbiddenException(
          'You can only assign riders for fulfillments linked to your sales.',
        );
      }
      if (fulfillment.type !== FulfillmentType.DELIVERY) {
        throw new BadRequestException('Fulfillment does not accept riders');
      }

      const interest = await trx.fulfillmentRiderInterest.findUnique({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
      });
      if (!interest) {
        throw new NotFoundException('Rider interest not found');
      }
      if (interest.status !== FulfillmentRiderInterestStatus.ACTIVE) {
        throw new BadRequestException('Rider is not actively interested');
      }

      const competingRiders = await trx.fulfillmentRiderInterest.findMany({
        where: {
          fulfillmentId,
          riderId: { not: riderId },
          status: FulfillmentRiderInterestStatus.ACTIVE,
        },
        select: { riderId: true },
      });

      await trx.fulfillmentRiderInterest.update({
        where: {
          fulfillmentId_riderId: { fulfillmentId, riderId },
        },
        data: { status: FulfillmentRiderInterestStatus.ASSIGNED },
      });
      if (competingRiders.length) {
        await trx.fulfillmentRiderInterest.updateMany({
          where: {
            fulfillmentId,
            riderId: { not: riderId },
            status: FulfillmentRiderInterestStatus.ACTIVE,
          },
          data: { status: FulfillmentRiderInterestStatus.REJECTED },
        });
      }
      if (
        fulfillment.status !== FulfillmentStatus.PENDING &&
        fulfillment.status !== FulfillmentStatus.ASSIGNED
      ) {
        throw new BadRequestException(
          'Fulfillment is not in an assignable state',
        );
      }
      await trx.fulfillment.update({
        where: { id: fulfillmentId },
        data: {
          status: FulfillmentStatus.ASSIGNED,
          deliveryPersonnelId: riderId,
          cost: interest.proposedCost ?? fulfillment.cost,
          costStatus: FulfillmentCostStatus.ACCEPTED,
          costAcceptedAt: new Date(),
        },
      });
      const previousState: FulfilState =
        (fulfillment.workflowState as FulfilState | null) ??
        fulfilmentStatusToState(fulfillment.status as FulfillmentStatus);
      const previousContext =
        fulfillment.workflowContext &&
        typeof fulfillment.workflowContext === 'object' &&
        !Array.isArray(fulfillment.workflowContext)
          ? (fulfillment.workflowContext as unknown as FulfilmentContext)
          : undefined;
      const events: FulfilEvent[] = [];
      if (
        previousState === 'ALLOCATING_STOCK' ||
        previousState === 'AWAITING_COST_CONFIRMATION'
      ) {
        events.push({ type: 'COST_CONFIRMED' });
      }
      events.push({ type: 'RIDER_SELECTED' });

      let nextState = previousState;
      let nextContext: FulfilmentContext | undefined = previousContext;
      const machineResult = runFulfilmentMachine({
        status: FulfillmentStatus.ASSIGNED,
        workflowState: previousState,
        workflowContext: previousContext ?? undefined,
        events,
        contextOverrides: {
          saleOrderId: fulfillment.saleOrderId,
        },
      });
      if (!machineResult.changed) {
        throw new BadRequestException('Fulfillment cannot accept rider');
      }
      nextState = machineResult.state;
      nextContext = machineResult.context;

      await this.workflow.recordFulfilmentTransition({
        fulfillmentId: fulfillment.id,
        fromState: previousState,
        toState: nextState,
        event: 'rider_assigned',
        context: toFulfilmentContextPayload(
          nextContext ?? {},
        ) as Prisma.InputJsonValue,
        tx: trx,
      });

      const assigned = await trx.fulfillmentRiderInterest.findUnique({
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

      return {
        assigned,
        saleOrderId: fulfillment.saleOrderId,
        billerId: fulfillment.saleOrder?.billerId ?? null,
        rejectedRiders: competingRiders.map((r) => r.riderId),
      };
    });

    if (!result.assigned) {
      throw new NotFoundException('Assigned rider interest not found');
    }

    const saleOrderId = result.saleOrderId;
    const riderName = await this.getRiderDisplayName(riderId);

    const notifyPromises: Array<Promise<void>> = [
      this.notify(
        riderId,
        'FULFILLMENT_ASSIGNED',
        `You have been assigned to deliver order ${saleOrderId}.`,
      ),
    ];

    if (result.billerId && result.billerId !== riderId) {
      notifyPromises.push(
        this.notify(
          result.billerId,
          'RIDER_INTEREST_ASSIGNED',
          `Rider ${riderName} has been assigned to order ${saleOrderId}.`,
        ),
      );
    }

    for (const competitor of result.rejectedRiders) {
      if (competitor === riderId) continue;
      notifyPromises.push(
        this.notify(
          competitor,
          'RIDER_INTEREST_REJECTED',
          `Another rider has been assigned to order ${saleOrderId}.`,
        ),
      );
    }

    await Promise.all(notifyPromises);
    await this.phaseCoordinator.onFulfilmentStatusChanged(
      saleOrderId,
      FulfillmentStatus.ASSIGNED,
    );

    return result.assigned;
  }
}
