import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { CreateConsumerSaleInput } from './dto/create-consumer-sale.input';
import { CreateResellerSaleInput } from './dto/create-reseller-sale.input';
import {
  SaleStatus,
  FulfillmentStatus,
  FulfillmentType as PrismaFulfillmentType,
  PaymentStatus as PrismaPaymentStatus,
  OrderPhase as PrismaOrderPhase,
  SaleType as PrismaSaleType,
} from '@prisma/client';
import { UpdateQuotationStatusInput } from './dto/update-quotation-status.input';
// import { QuotationCreateInput } from '../../shared/prismagraphql/quotation';
import { SaleType } from 'src/shared/prismagraphql/prisma/sale-type.enum';
import { OrderPhase } from 'src/shared/prismagraphql/prisma/order-phase.enum';
// After prisma generate, prefer importing OrderPhase enum
import { CreateConsumerPaymentInput } from './dto/create-consumer-payment.input';
import { ConfirmConsumerPaymentInput } from './dto/confirm-consumer-payment.input';
import { CreateConsumerReceiptInput } from './dto/create-consumer-receipt.input';
import { MovementDirection } from 'src/shared/prismagraphql/prisma/movement-direction.enum';
import { MovementType } from 'src/shared/prismagraphql/prisma/movement-type.enum';
import { CreateFulfillmentInput } from './dto/create-fulfillment.input';
import { UpdateFulfillmentPreferencesInput } from './dto/update-fulfillment-preferences.input';
import { CreateResellerPaymentInput } from './dto/create-reseller-payment.input';
import { PaymentService } from '../payment/payment.service';
import { SaleChannel } from 'src/shared/prismagraphql/prisma/sale-channel.enum';
import { QuotationStatus } from 'src/shared/prismagraphql/prisma/quotation-status.enum';
import { ensureQuotationTransition } from 'src/shared/workflows/quotation-state';
import {
  runSaleMachine,
  saleStatusToState,
  toSaleContextPayload,
  SaleWorkflowState,
  SaleContext,
} from '../../state/sale.machine';
import {
  eventsForFulfilmentTransition,
  runFulfilmentMachine,
  fulfilmentStatusToState,
  toFulfilmentContextPayload,
  FulfilmentContext,
  FulfilState,
} from '../../state/fulfilment.machine';
import { PhaseCoordinator } from '../../state/phase-coordinator';
import { CreateQuotationDraftInput } from './dto/create-quotation-draft.input';
import { CheckoutConsumerQuotationInput } from './dto/checkout-consumer-quotation.input';
import { ConfirmResellerQuotationInput } from './dto/confirm-reseller-quotation.input';
import { BillerConvertQuotationInput } from './dto/biller-convert-quotation.input';
import { FulfillConsumerSaleInput } from './dto/fulfill-consumer-sale.input';
import { DomainEventsService } from '../events/services/domain-events.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { UpdateQuotationInput } from './dto/update-quotation.input';
import { WorkflowService } from '../../state/workflow.service';
import { SaleOrder } from '@prisma/client';
import { SystemSettingsService } from '../system-settings/system-settings.service';

type PrismaCustomerClient = PrismaService | Prisma.TransactionClient;

type SaleWorkflowComputation = {
  order: {
    id: string;
    status: SaleStatus;
    phase: PrismaOrderPhase;
    type: PrismaSaleType;
    fulfillmentType: PrismaFulfillmentType | null;
    deliveryAddress: string | null;
    totalAmount: number;
    storeId: string;
    workflowState: string | null;
    workflowContext: Prisma.JsonValue | null;
  };
  previousState: SaleWorkflowState | null;
  previousContext: SaleContext | null;
  baseContext: SaleContext;
  paid: number;
  canAdvanceByPayment: boolean;
  canAdvanceByCredit: boolean;
  overage: number;
};

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private domainEvents: DomainEventsService,
    private payments: PaymentService,
    private analytics: AnalyticsService,
    private phaseCoordinator: PhaseCoordinator,
    private workflow: WorkflowService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  private async ensureCustomerRecord(
    prisma: PrismaCustomerClient,
    consumerId: string,
  ): Promise<void> {
    if (!consumerId) return;
    const existing = await prisma.customer.findUnique({
      where: { id: consumerId },
    });
    if (existing) return;

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: consumerId },
      include: { user: true },
    });

    const fallbackUser =
      profile?.user ??
      (await prisma.user.findUnique({ where: { id: consumerId } }));

    if (!profile && !fallbackUser) {
      throw new BadRequestException('Consumer profile not found');
    }

    const fullName =
      profile?.fullName?.trim() || fallbackUser?.email || 'Customer';
    const email = profile?.email?.trim() || fallbackUser?.email || null;
    const phone = profile?.phone?.trim() || null;
    const preferredStoreId = profile?.preferredStoreId || null;

    try {
      await prisma.customer.create({
        data: {
          id: consumerId,
          fullName,
          email,
          phone,
          preferredStoreId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private cloneOverrides(
    overrides?: SaleContext['overrides'],
  ): SaleContext['overrides'] {
    return {
      admin: overrides?.admin ? { ...overrides.admin } : undefined,
      credit: overrides?.credit ? { ...overrides.credit } : undefined,
    };
  }

  private toIsoOrNull(input?: Date | string | null): string | null {
    if (!input) return null;
    const value = input instanceof Date ? input : new Date(input);
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  // Quotation flows
  async quotations() {
    return this.prisma.quotation.findMany({
      include: { items: true, reseller: true, biller: true },
    });
  }

  async quotation(id: string) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async updateQuotation(input: UpdateQuotationInput) {
    return this.prisma.$transaction(async (trx) => {
      const current = await trx.quotation.findUnique({
        where: { id: input.id },
        include: { items: true, SaleOrder: true },
      });
      if (!current) throw new NotFoundException('Quotation not found');

      if (
        current.status !== QuotationStatus.DRAFT &&
        current.status !== QuotationStatus.SENT
      ) {
        throw new BadRequestException(
          'Only draft or sent quotations can be edited',
        );
      }

      const quotationData: Prisma.QuotationUpdateInput = {};
      const saleOrderData: Prisma.SaleOrderUpdateInput = {};

      if (input.type && input.type !== current.type) {
        quotationData.type = input.type;
        saleOrderData.type = input.type;
      }

      if (input.channel && input.channel !== current.channel) {
        quotationData.channel = input.channel;
      }

      if (input.storeId && input.storeId !== current.storeId) {
        quotationData.store = { connect: { id: input.storeId } };
        saleOrderData.storeId = input.storeId;
      }

      if (input.billerId !== undefined) {
        quotationData.biller = input.billerId
          ? { connect: { id: input.billerId } }
          : { disconnect: true };
        if (current.SaleOrder) {
          saleOrderData.biller = {
            connect: {
              id: input.billerId ?? current.SaleOrder.billerId,
            },
          };
        }
      }

      if (
        input.type === SaleType.CONSUMER ||
        (!input.type && current.type === SaleType.CONSUMER)
      ) {
        if (input.consumerId !== undefined) {
          if (input.consumerId) {
            await this.ensureCustomerRecord(trx, input.consumerId);
          }
          quotationData.consumer = input.consumerId
            ? { connect: { id: input.consumerId } }
            : { disconnect: true };
        }
        quotationData.reseller = { disconnect: true };
      }

      if (
        input.type === SaleType.RESELLER ||
        (!input.type && current.type === SaleType.RESELLER)
      ) {
        if (input.resellerId !== undefined) {
          quotationData.reseller = input.resellerId
            ? { connect: { id: input.resellerId } }
            : { disconnect: true };
        }
        quotationData.consumer = { disconnect: true };
      }

      if (input.items && input.items.length === 0) {
        throw new BadRequestException(
          'At least one quotation item is required',
        );
      }

      if (input.items) {
        const total = input.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );
        quotationData.totalAmount = total;
        saleOrderData.totalAmount = total;
      }

      await trx.quotation.update({
        where: { id: current.id },
        data: quotationData,
      });

      if (input.items) {
        await trx.quotationItem.deleteMany({
          where: { quotationId: current.id },
        });
        await trx.quotationItem.createMany({
          data: input.items.map((item) => ({
            quotationId: current.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
      }

      if (current.saleOrderId && Object.keys(saleOrderData).length) {
        await trx.saleOrder.update({
          where: { id: current.saleOrderId },
          data: saleOrderData,
        });
      }

      return trx.quotation.findUnique({
        where: { id: current.id },
        include: { items: true, SaleOrder: true },
      });
    });
  }

  async createQuotationDraft(input: CreateQuotationDraftInput) {
    if (input.type === SaleType.CONSUMER && !input.consumerId) {
      throw new BadRequestException(
        'consumerId is required for CONSUMER quotations',
      );
    }
    if (input.type === SaleType.RESELLER && !input.resellerId) {
      throw new BadRequestException(
        'resellerId is required for RESELLER quotations',
      );
    }
    const derivedItems = [] as Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
    }>;
    for (const item of input.items) {
      const unitPrice =
        item.unitPrice != null
          ? item.unitPrice
          : await this.getEffectiveUnitPrice(
              item.productVariantId,
              input.type,
              input.resellerId || undefined,
            );
      derivedItems.push({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice,
      });
    }
    const total = derivedItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const initialContext: SaleContext = {
      orderId: '',
      grandTotal: total,
      capturedTotal: 0,
      credit: {
        limit: total,
        exposure: 0,
        overage: total,
      },
      overrides: {},
      clearToFulfil: false,
    };

    if (input.type === SaleType.CONSUMER && input.consumerId) {
      await this.ensureCustomerRecord(this.prisma, input.consumerId);
    }

    // Create a SaleOrder up-front so order lifecycle starts in QUOTATION phase
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: input.storeId,
        billerId: input.billerId || input.resellerId || input.consumerId || '',
        type: input.type,
        status: SaleStatus.PENDING,
        phase: OrderPhase.QUOTATION,
        totalAmount: total,
      },
    });
    initialContext.orderId = order.id;
    await this.workflow.recordSaleTransition({
      orderId: order.id,
      fromState: null,
      toState: 'QUOTATION_DRAFT',
      event: 'quotation.draft_created',
      context: toSaleContextPayload(initialContext) as Prisma.InputJsonValue,
    });

    const q = await this.prisma.quotation.create({
      data: {
        type: input.type,
        channel: input.channel,
        storeId: input.storeId,
        consumerId: input.consumerId || null,
        resellerId: input.resellerId || null,
        billerId: input.billerId || null,
        status: QuotationStatus.DRAFT,
        totalAmount: total,
        saleOrderId: order.id,
        items: {
          create: derivedItems.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    if (q.billerId) {
      await this.notificationService.createNotification(
        q.billerId,
        'QUOTATION_DRAFT_CREATED',
        `Quotation ${q.id} created (draft).`,
      );
      // Outbox will handle notification via NotificationService
    }
    if (q.resellerId) {
      await this.notificationService.createNotification(
        q.resellerId,
        'QUOTATION_DRAFT_CREATED',
        `Quotation ${q.id} created (draft).`,
      );
      // Outbox will handle notification via NotificationService
    }
    return q;
  }

  async updateQuotationStatus(input: UpdateQuotationStatusInput) {
    const current = await this.prisma.quotation.findUnique({
      where: { id: input.id },
      include: { items: true, SaleOrder: true },
    });
    if (!current) throw new NotFoundException('Quotation not found');

    if (input.status !== current.status) {
      try {
        ensureQuotationTransition(current.status, input.status);
      } catch {
        throw new BadRequestException(
          `Cannot transition quotation from ${current.status} to ${input.status}`,
        );
      }
    }

    if (
      input.status === QuotationStatus.APPROVED &&
      current.status !== QuotationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Quotation must be CONFIRMED before it can be APPROVED',
      );
    }

    const q = await this.prisma.quotation.update({
      where: { id: input.id },
      data: { status: input.status },
      include: { items: true, SaleOrder: true },
    });

    // On CONFIRMED notify stakeholders
    if (q.status === QuotationStatus.CONFIRMED) {
      const notify = q.resellerId || q.consumerId || q.billerId;
      if (notify) {
        await this.notificationService.createNotification(
          notify,
          'QUOTATION_CONFIRMED',
          `Quotation ${q.id} confirmed.`,
        );
        // Outbox will handle notification via NotificationService
      }
    }

    // On APPROVED: transition order to SALE and create sale record
    if (q.status === QuotationStatus.APPROVED) {
      let orderId = q.saleOrderId;
      if (!orderId) {
        const total = q.items.reduce(
          (sum, i) => sum + i.quantity * i.unitPrice,
          0,
        );
        const createdOrder = await this.prisma.saleOrder.create({
          data: {
            storeId: q.storeId,
            billerId: q.billerId || '',
            type: q.type,
            status: SaleStatus.PENDING,
            phase: OrderPhase.SALE,
            totalAmount: total,
            workflowState: 'AWAITING_PAYMENT_METHOD',
          },
        });
        orderId = createdOrder.id;
        await this.prisma.quotation.update({
          where: { id: q.id },
          data: { saleOrderId: orderId },
        });
      } else {
        await this.prisma.saleOrder.update({
          where: { id: orderId },
          data: { phase: OrderPhase.SALE },
        });
      }

      await this.phaseCoordinator.onQuotationApproved(q.id);

      if (q.type === SaleType.CONSUMER) {
        const exists = await this.prisma.consumerSale.findFirst({
          where: { saleOrderId: orderId },
        });
        if (!exists) {
          await this.prisma.consumerSale.create({
            data: {
              saleOrderId: orderId,
              customerId: q.consumerId!,
              storeId: q.storeId,
              billerId: q.billerId!,
              channel: q.channel as SaleChannel,
              status: SaleStatus.PENDING,
              totalAmount: q.totalAmount,
              quotationId: q.id,
              items: {
                create: q.items.map((i) => ({
                  productVariantId: i.productVariantId,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                })),
              },
            },
          });
        }
      } else if (q.type === (SaleType.RESELLER as typeof q.type)) {
        const exists = await this.prisma.resellerSale.findFirst({
          where: { SaleOrderid: orderId },
        });
        if (!exists) {
          await this.prisma.resellerSale.create({
            data: {
              SaleOrderid: orderId,
              resellerId: q.resellerId!,
              billerId: q.billerId!,
              storeId: q.storeId,
              status: SaleStatus.PENDING,
              totalAmount: q.totalAmount,
              quotationId: q.id,
              items: {
                create: q.items.map((i) => ({
                  productVariantId: i.productVariantId,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                })),
              },
            },
          });
        }
      }

      // Notify accounting/store manager
      if (q.billerId) {
        await this.notificationService.createNotification(
          q.billerId,
          'ORDER_ENTERED_SALE_PHASE',
          `Order ${q.saleOrderId} approved; awaiting payment/credit check.`,
        );
        // Outbox will handle notification via NotificationService
      }
      const store = await this.prisma.store.findUnique({
        where: { id: q.storeId },
      });
      if (store) {
        await this.notificationService.createNotification(
          store.managerId,
          'SALE_PHASE_NOTIFICATION',
          `Order ${q.saleOrderId} is in sale phase for store ${store.name}.`,
        );
        // Outbox will handle notification via NotificationService
      }
    }

    const notifyUserId = q.resellerId || q.consumerId || q.billerId;
    if (notifyUserId) {
      await this.notificationService.createNotification(
        notifyUserId,
        'QUOTATION_UPDATED',
        `Quotation ${q.id} ${q.status}`,
      );
    }
    return q;
  }

  async checkoutConsumerQuotation(input: CheckoutConsumerQuotationInput) {
    const q = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId },
      include: { items: true, SaleOrder: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.type !== SaleType.CONSUMER) {
      throw new BadRequestException('Quotation is not a CONSUMER quotation');
    }
    if (!q.consumerId) {
      throw new BadRequestException('Quotation missing consumerId');
    }
    const total = q.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const initialContext: SaleContext = {
      orderId: '',
      grandTotal: total,
      capturedTotal: 0,
      credit: {
        limit: total,
        exposure: 0,
        overage: total,
      },
      overrides: {},
      clearToFulfil: false,
    };
    let order: SaleOrder;
    let previousWorkflowState: string | null = null;

    if (q.saleOrderId && q.SaleOrder) {
      previousWorkflowState = q.SaleOrder.workflowState ?? null;
      initialContext.orderId = q.SaleOrder.id;
      order = await this.prisma.saleOrder.update({
        where: { id: q.SaleOrder.id },
        data: {
          billerId: input.billerId,
          status: SaleStatus.PENDING,
          phase: OrderPhase.SALE,
          totalAmount: total,
          workflowState: 'AWAITING_PAYMENT_METHOD',
          workflowContext: toSaleContextPayload(
            initialContext,
          ) as Prisma.InputJsonValue,
        },
      });
    } else {
      order = await this.prisma.saleOrder.create({
        data: {
          storeId: q.storeId,
          billerId: input.billerId,
          type: SaleType.CONSUMER,
          status: SaleStatus.PENDING,
          phase: OrderPhase.SALE,
          totalAmount: total,
          workflowState: 'AWAITING_PAYMENT_METHOD',
          workflowContext: toSaleContextPayload(
            initialContext,
          ) as Prisma.InputJsonValue,
        },
      });
      initialContext.orderId = order.id;
      order = await this.prisma.saleOrder.update({
        where: { id: order.id },
        data: {
          workflowContext: toSaleContextPayload(
            initialContext,
          ) as Prisma.InputJsonValue,
        },
      });
    }

    await this.workflow.recordSaleTransition({
      orderId: order.id,
      fromState: previousWorkflowState,
      toState: 'AWAITING_PAYMENT_METHOD',
      event: 'quotation.checkout',
      context: toSaleContextPayload(initialContext) as Prisma.InputJsonValue,
    });
    const sale = await this.prisma.consumerSale.create({
      data: {
        saleOrderId: order.id,
        quotationId: q.id,
        customerId: q.consumerId,
        storeId: q.storeId,
        billerId: input.billerId,
        channel: q.channel as SaleChannel,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: q.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.prisma.quotation.update({
      where: { id: q.id },
      data: { status: QuotationStatus.APPROVED, saleOrderId: order.id },
    });
    await this.phaseCoordinator.onQuotationApproved(q.id);
    await this.notificationService.createNotification(
      sale.billerId,
      'CONSUMER_SALE_CREATED_FROM_QUOTATION',
      `Sale ${sale.id} created from quotation ${q.id}.`,
    );
    return sale;
  }

  async confirmResellerQuotation(input: ConfirmResellerQuotationInput) {
    const q = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId },
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.type !== SaleType.RESELLER) {
      throw new BadRequestException('Quotation is not a RESELLER quotation');
    }
    if (!q.resellerId) {
      throw new BadRequestException('Quotation missing resellerId');
    }
    const total = q.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const initialContext: SaleContext = {
      orderId: '',
      grandTotal: total,
      capturedTotal: 0,
      credit: {
        limit: total,
        exposure: 0,
        overage: total,
      },
      overrides: {},
      clearToFulfil: false,
    };
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: q.storeId,
        billerId: input.billerId,
        type: SaleType.RESELLER,
        status: SaleStatus.PENDING,
        phase: OrderPhase.SALE,
        totalAmount: total,
        workflowState: 'AWAITING_PAYMENT_METHOD',
      },
    });
    initialContext.orderId = order.id;
    await this.workflow.recordSaleTransition({
      orderId: order.id,
      fromState: null,
      toState: 'AWAITING_PAYMENT_METHOD',
      event: 'quotation.confirm_reseller',
      context: toSaleContextPayload(initialContext) as Prisma.InputJsonValue,
    });
    const sale = await this.prisma.resellerSale.create({
      data: {
        SaleOrderid: order.id,
        quotationId: q.id,
        resellerId: q.resellerId,
        billerId: input.billerId,
        storeId: q.storeId,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: q.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.prisma.quotation.update({
      where: { id: q.id },
      data: { status: QuotationStatus.APPROVED, saleOrderId: order.id },
    });
    await this.phaseCoordinator.onQuotationApproved(q.id);
    await this.notificationService.createNotification(
      sale.billerId,
      'RESELLER_SALE_CREATED_FROM_QUOTATION',
      `Reseller sale ${sale.id} created from quotation ${q.id}.`,
    );
    return sale;
  }

  async billerConvertConfirmedQuotation(input: BillerConvertQuotationInput) {
    const q = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId },
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.status !== QuotationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Quotation must be CONFIRMED for biller conversion',
      );
    }
    if (q.saleOrderId) {
      throw new BadRequestException('Quotation already converted');
    }
    if (q.type === SaleType.CONSUMER) {
      await this.checkoutConsumerQuotation({
        quotationId: q.id,
        billerId: input.billerId,
      });
    } else if (q.type === (SaleType.RESELLER as unknown as typeof q.type)) {
      await this.confirmResellerQuotation({
        quotationId: q.id,
        billerId: input.billerId,
      });
    } else {
      throw new BadRequestException('Unsupported quotation type');
    }
    const updated = await this.prisma.quotation.findUnique({
      where: { id: q.id },
    });
    return updated!;
  }

  // Consumer Sales
  async consumerSales() {
    return this.prisma.consumerSale.findMany({
      include: {
        items: true,
        store: true,
        customer: true,
        biller: { include: { customerProfile: true } },
      },
    });
  }

  async consumerSale(id: string) {
    const sale = await this.prisma.consumerSale.findUnique({
      where: { id },
      include: {
        items: true,
        store: true,
        customer: true,
        biller: { include: { customerProfile: true } },
      },
    });
    if (!sale) throw new NotFoundException('Consumer sale not found');
    return sale;
  }

  async createConsumerSale(data: CreateConsumerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const initialContext: SaleContext = {
      orderId: '',
      grandTotal: total,
      capturedTotal: 0,
      credit: {
        limit: total,
        exposure: 0,
        overage: total,
      },
      overrides: {},
      clearToFulfil: false,
    };
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.CONSUMER,
        status: SaleStatus.PENDING,
        phase: OrderPhase.SALE,
        totalAmount: total,
        workflowState: 'AWAITING_PAYMENT_METHOD',
      },
    });
    initialContext.orderId = order.id;
    await this.workflow.recordSaleTransition({
      orderId: order.id,
      fromState: null,
      toState: 'AWAITING_PAYMENT_METHOD',
      event: 'consumer_sale.created',
      context: toSaleContextPayload(initialContext) as Prisma.InputJsonValue,
    });
    const sale = await this.prisma.consumerSale.create({
      data: {
        saleOrderId: order.id,
        customerId: data.customerId,
        storeId: data.storeId,
        billerId: data.billerId,
        channel: data.channel,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'CONSUMER_SALE_CREATED',
      `Sale ${sale.id} is pending payment.`,
    );
    return sale;
  }

  async registerConsumerPayment(data: CreateConsumerPaymentInput) {
    return this.payments.registerConsumerPayment(data);
  }

  async confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    // Payment confirmation publishes event; order advancement handled by PaymentsOutboxHandler
    return this.payments.confirmConsumerPayment(input);
  }

  async createConsumerReceipt(data: CreateConsumerReceiptInput) {
    const receipt = await this.prisma.consumerReceipt.create({ data });
    await this.notificationService.createNotification(
      data.issuedById,
      'CONSUMER_RECEIPT_CREATED',
      `Receipt ${receipt.id} created.`,
    );
    return receipt;
  }

  async fulfillConsumerSale(input: FulfillConsumerSaleInput) {
    const sale = await this.prisma.consumerSale.findUnique({
      where: { id: input.id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Cannot fulfill a cancelled sale');
    }
    const saleOrder = await this.prisma.saleOrder.findUnique({
      where: { id: sale.saleOrderId },
    });
    if (!saleOrder) throw new NotFoundException('Sale order not found');
    if (saleOrder.status === SaleStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot fulfill an order that has been cancelled',
      );
    }
    await this.prisma.stockMovement.create({
      data: {
        storeId: sale.storeId,
        direction: MovementDirection.OUT,
        movementType: MovementType.SALE,
        referenceEntity: 'ConsumerSale',
        referenceId: sale.id,
        items: {
          create: sale.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
        },
      },
    });
    for (const item of sale.items) {
      await this.prisma.stock.upsert({
        where: {
          storeId_productVariantId: {
            storeId: sale.storeId,
            productVariantId: item.productVariantId,
          },
        },
        update: {
          quantity: { decrement: item.quantity },
          reserved: { decrement: item.quantity },
        },
        create: {
          storeId: sale.storeId,
          productVariantId: item.productVariantId,
          quantity: -item.quantity,
          reserved: 0,
        },
      });
    }
    const updated = await this.prisma.consumerSale.update({
      where: { id: sale.id },
      data: { status: SaleStatus.FULFILLED },
    });
    // Analytics: record fulfilled sale for stats and preferences
    await this.analytics.recordConsumerSaleFulfilled({
      id: updated.id,
      customerId: updated.customerId,
      items: sale.items.map((i) => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity,
      })),
    });
    if (saleOrder.status !== SaleStatus.FULFILLED) {
      await this.prisma.saleOrder.update({
        where: { id: sale.saleOrderId },
        data: {
          status: SaleStatus.FULFILLED,
          phase: OrderPhase.FULFILLMENT,
        },
      });
    }
    await this.notificationService.createNotification(
      updated.billerId,
      'CONSUMER_SALE_FULFILLED',
      `Sale ${updated.id} fulfilled.`,
    );
    // Outbox will handle notification via NotificationService
    return updated;
  }

  // Reseller Sales
  async resellerSales() {
    return this.prisma.resellerSale.findMany({
      include: {
        items: true,
        store: true,
        reseller: { include: { customerProfile: true } },
        biller: { include: { customerProfile: true } },
      },
    });
  }

  async resellerSale(id: string) {
    const sale = await this.prisma.resellerSale.findUnique({
      where: { id },
      include: {
        items: true,
        store: true,
        reseller: { include: { customerProfile: true } },
        biller: { include: { customerProfile: true } },
      },
    });
    if (!sale) throw new NotFoundException('Reseller sale not found');
    return sale;
  }

  async createResellerSale(data: CreateResellerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const initialContext: SaleContext = {
      orderId: '',
      grandTotal: total,
      capturedTotal: 0,
      credit: {
        limit: total,
        exposure: 0,
        overage: total,
      },
      overrides: {},
      clearToFulfil: false,
    };
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.RESELLER,
        status: SaleStatus.PENDING,
        phase: OrderPhase.SALE,
        totalAmount: total,
        workflowState: 'AWAITING_PAYMENT_METHOD',
      },
    });
    initialContext.orderId = order.id;
    await this.workflow.recordSaleTransition({
      orderId: order.id,
      fromState: null,
      toState: 'AWAITING_PAYMENT_METHOD',
      event: 'reseller_sale.created',
      context: toSaleContextPayload(initialContext) as Prisma.InputJsonValue,
    });
    const sale = await this.prisma.resellerSale.create({
      data: {
        SaleOrderid: order.id,
        resellerId: data.resellerId,
        billerId: data.billerId,
        storeId: data.storeId,
        status: SaleStatus.PENDING,
        totalAmount: total,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      sale.billerId,
      'RESELLER_SALE_CREATED',
      `Reseller sale ${sale.id} is pending payment.`,
    );
    return sale;
  }

  async registerResellerPayment(data: CreateResellerPaymentInput) {
    return this.payments.registerResellerPayment(data);
  }

  async confirmResellerPayment(paymentId: string) {
    // Payment confirmation publishes event; order advancement handled by PaymentsOutboxHandler
    return this.payments.confirmResellerPayment(paymentId);
  }

  private async loadSaleWorkflowSnapshot(
    orderId: string,
    options?: { allocateCredit?: boolean },
  ): Promise<SaleWorkflowComputation> {
    const allocateCredit = options?.allocateCredit ?? false;

    return this.prisma.$transaction(async (trx) => {
      const order = await trx.saleOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          phase: true,
          type: true,
          fulfillmentType: true,
          deliveryAddress: true,
          totalAmount: true,
          storeId: true,
          workflowState: true,
          workflowContext: true,
        },
      });
      if (!order) {
        throw new NotFoundException('Sale order not found');
      }

      const [consumerPaidAgg, resellerPaidAgg] = await Promise.all([
        trx.consumerPayment.aggregate({
          _sum: { amount: true },
          where: {
            saleOrderId: orderId,
            status: PrismaPaymentStatus.CONFIRMED,
          },
        }),
        trx.resellerPayment.aggregate({
          _sum: { amount: true },
          where: {
            saleOrderId: orderId,
            status: PrismaPaymentStatus.CONFIRMED,
          },
        }),
      ]);

      const paid =
        (consumerPaidAgg._sum.amount || 0) + (resellerPaidAgg._sum.amount || 0);
      const total = order.totalAmount || 0;
      const overage = Math.max(total - paid, 0);

      const previousContext =
        order.workflowContext && typeof order.workflowContext === 'object'
          ? (order.workflowContext as unknown as SaleContext)
          : null;
      const rawState = order.workflowState as SaleWorkflowState | null;
      const isQuotationPhase = order.phase === PrismaOrderPhase.QUOTATION;
      const previousState = isQuotationPhase
        ? null
        : rawState && rawState !== 'QUOTATION_DRAFT'
          ? rawState
          : saleStatusToState(order.status);

      const baseContext: SaleContext = {
        orderId: order.id,
        grandTotal: total,
        capturedTotal: paid,
        credit: {
          limit: previousContext?.credit?.limit ?? total,
          exposure: previousContext?.credit?.exposure ?? 0,
          overage,
        },
        overrides: this.cloneOverrides(previousContext?.overrides),
        clearToFulfil: previousContext?.clearToFulfil ?? false,
      };

      const canAdvanceByPayment = paid >= total;
      let canAdvanceByCredit = false;

      let creditLimit = baseContext.credit.limit ?? total;
      let creditExposure = baseContext.credit.exposure ?? 0;

      if (
        !canAdvanceByPayment &&
        total > 0 &&
        order.type === PrismaSaleType.RESELLER
      ) {
        const resellerSale = await trx.resellerSale.findFirst({
          where: { SaleOrderid: orderId },
          select: { resellerId: true },
        });
        if (resellerSale?.resellerId) {
          const profile = await trx.resellerProfile.findUnique({
            where: { userId: resellerSale.resellerId },
            select: { creditLimit: true, outstandingBalance: true },
          });
          if (profile) {
            creditLimit = profile.creditLimit ?? creditLimit;
            const outstanding = profile.outstandingBalance ?? 0;
            const projected = outstanding + overage;
            if (projected <= creditLimit) {
              canAdvanceByCredit = true;
              creditExposure = projected;
              if (allocateCredit) {
                await trx.resellerProfile.update({
                  where: { userId: resellerSale.resellerId },
                  data: { outstandingBalance: projected },
                });
              }
            } else {
              creditExposure = outstanding;
            }
          }
        }
      }

      const now = Date.now();
      const adminOverride = baseContext.overrides.admin;
      if (
        adminOverride?.status === 'APPROVED' &&
        (!adminOverride.expiresAt ||
          new Date(adminOverride.expiresAt).getTime() > now)
      ) {
        canAdvanceByCredit = true;
      }

      const creditOverride = baseContext.overrides.credit;
      if (
        creditOverride?.status === 'APPROVED' &&
        (!creditOverride.expiresAt ||
          new Date(creditOverride.expiresAt).getTime() > now) &&
        (creditOverride.approvedAmount ?? 0) >= overage
      ) {
        canAdvanceByCredit = true;
      }

      baseContext.credit.limit = creditLimit;
      baseContext.credit.exposure = creditExposure;
      baseContext.clearToFulfil =
        baseContext.clearToFulfil || canAdvanceByPayment || canAdvanceByCredit;

      return {
        order,
        previousState,
        previousContext,
        baseContext,
        paid,
        canAdvanceByPayment,
        canAdvanceByCredit,
        overage,
      };
    });
  }

  // Utility: evaluate payments/credit and advance to fulfillment if eligible
  private async maybeAdvanceOrderToFulfillment(orderId: string) {
    const snapshot = await this.loadSaleWorkflowSnapshot(orderId, {
      allocateCredit: true,
    });
    const {
      order,
      previousState,
      previousContext,
      baseContext,
      paid,
      canAdvanceByPayment,
      canAdvanceByCredit,
    } = snapshot;
    let currentOrderStatus = order.status;
    if (order.phase !== OrderPhase.SALE) return; // Only advance from SALE phase
    if (
      currentOrderStatus === SaleStatus.PAID ||
      currentOrderStatus === SaleStatus.FULFILLED ||
      currentOrderStatus === SaleStatus.CANCELLED
    ) {
      return;
    }

    const effectiveClear =
      baseContext.clearToFulfil || canAdvanceByPayment || canAdvanceByCredit;
    const saleMachineResult = runSaleMachine({
      status: currentOrderStatus,
      workflowState: previousState,
      workflowContext: previousContext ?? undefined,
      event: { type: 'PAYMENT_CONFIRMED', amount: paid },
      contextOverrides: {
        ...baseContext,
        overrides: this.cloneOverrides(baseContext.overrides),
        clearToFulfil: effectiveClear,
      },
    });

    if (
      saleMachineResult.changed ||
      previousContext?.clearToFulfil !==
        saleMachineResult.context.clearToFulfil ||
      previousContext?.credit?.overage !==
        saleMachineResult.context.credit.overage
    ) {
      await this.workflow.recordSaleTransition({
        orderId,
        fromState: previousState,
        toState: saleMachineResult.state,
        event: 'PAYMENT_CONFIRMED',
        context: toSaleContextPayload(
          saleMachineResult.context,
        ) as Prisma.InputJsonValue,
      });
    }

    if (saleMachineResult.state !== 'CLEARED_FOR_FULFILMENT') {
      return;
    }

    if (!saleMachineResult.context.clearToFulfil) {
      return;
    }

    // Update order status if fully paid
    if (paid >= order.totalAmount) {
      await this.prisma.saleOrder.update({
        where: { id: orderId },
        data: { status: SaleStatus.PAID },
      });
      currentOrderStatus = SaleStatus.PAID;
    }

    const desiredFulfilmentType =
      order.fulfillmentType ?? PrismaFulfillmentType.PICKUP;
    const normalizedAddress = (order.deliveryAddress ?? '').trim() || null;

    if (
      desiredFulfilmentType === PrismaFulfillmentType.DELIVERY &&
      !normalizedAddress
    ) {
      // Delivery orders must capture an address before advancing
      return;
    }

    await this.prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        phase: OrderPhase.FULFILLMENT,
        fulfillmentType: desiredFulfilmentType,
        deliveryAddress: normalizedAddress,
      },
    });
    const existing = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: orderId },
    });
    if (!existing) {
      const fulfilment = await this.prisma.fulfillment.create({
        data: {
          saleOrderId: orderId,
          type: desiredFulfilmentType,
          status: 'PENDING',
          workflowState: 'ALLOCATING_STOCK',
          deliveryAddress: normalizedAddress,
        },
      });
      await this.workflow.recordFulfilmentTransition({
        fulfillmentId: fulfilment.id,
        fromState: null,
        toState: 'ALLOCATING_STOCK',
        event: 'fulfilment.created',
        context: toFulfilmentContextPayload({
          saleOrderId: orderId,
        }) as Prisma.InputJsonValue,
      });
    }

    await this.phaseCoordinator.onSaleCleared(orderId);

    // Notify store manager and biller
    const so = await this.prisma.saleOrder.findUnique({
      where: { id: orderId },
    });
    if (so) {
      const store = await this.prisma.store.findUnique({
        where: { id: so.storeId },
      });
      if (store) {
        await this.notificationService.createNotification(
          store.managerId,
          'FULFILLMENT_REQUESTED',
          `Order ${orderId} ready for fulfillment at store ${store.name}.`,
        );
        // Outbox will handle notification via NotificationService
      }
      await this.notificationService.createNotification(
        so.billerId,
        'ORDER_ADVANCED_TO_FULFILLMENT',
        `Order ${orderId} advanced to fulfillment phase.`,
      );
      // Outbox will handle notification via NotificationService
    }
  }

  // Admin action: revert order back to QUOTATION phase for modification
  async adminRevertOrderToQuotation(orderId: string) {
    const order = await this.prisma.saleOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        workflowState: true,
        workflowContext: true,
        phase: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const previousContext =
      order.workflowContext && typeof order.workflowContext === 'object'
        ? (order.workflowContext as unknown as SaleContext)
        : null;
    const previousState =
      (order.workflowState as SaleWorkflowState | null) ??
      saleStatusToState(order.status);
    const revertResult = runSaleMachine({
      status: order.status,
      workflowState: previousState,
      workflowContext: previousContext ?? undefined,
      event: { type: 'RESET' },
    });
    if (!revertResult.changed && order.status !== SaleStatus.PENDING) {
      throw new BadRequestException(
        `Cannot transition sale order from ${order.status} to ${SaleStatus.PENDING}`,
      );
    }

    await this.workflow.recordSaleTransition({
      orderId,
      fromState: previousState,
      toState: revertResult.state,
      event: 'RESET',
      context: toSaleContextPayload(
        revertResult.context,
      ) as Prisma.InputJsonValue,
    });

    // Remove fulfillment if exists
    const f = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: orderId },
    });
    if (f) await this.prisma.fulfillment.delete({ where: { id: f.id } });

    // Delete sale records and their items
    const cSale = await this.prisma.consumerSale.findFirst({
      where: { saleOrderId: orderId },
    });
    if (cSale) {
      await this.prisma.consumerSaleItem.deleteMany({
        where: { consumerSaleId: cSale.id },
      });
      await this.prisma.consumerSale.delete({ where: { id: cSale.id } });
    }
    const rSale = await this.prisma.resellerSale.findFirst({
      where: { SaleOrderid: orderId },
    });
    if (rSale) {
      await this.prisma.resellerSaleItem.deleteMany({
        where: { resellerSaleId: rSale.id },
      });
      await this.prisma.resellerSale.delete({ where: { id: rSale.id } });
    }

    // Reset order to quotation phase
    const updated = await this.prisma.saleOrder.update({
      where: { id: orderId },
      data: { phase: 'QUOTATION', status: SaleStatus.PENDING },
    });

    // Reset quotation status to SENT if exists
    const quotation = await this.prisma.quotation.findFirst({
      where: { saleOrderId: orderId },
    });
    if (quotation) {
      await this.prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: QuotationStatus.SENT },
      });
      const notify =
        quotation.resellerId || quotation.consumerId || quotation.billerId;
      if (notify) {
        await this.notificationService.createNotification(
          notify,
          'ORDER_REVERTED_TO_QUOTATION',
          `Order ${orderId} reverted to quotation phase by admin.`,
        );
      }
    }

    return updated;
  }

  async grantAdminOverride(params: {
    saleOrderId: string;
    approvedBy?: string | null;
    expiresAt?: Date | string | null;
  }): Promise<void> {
    const snapshot = await this.loadSaleWorkflowSnapshot(params.saleOrderId);
    const expiresAtIso = this.toIsoOrNull(params.expiresAt);
    const overrides = this.cloneOverrides(snapshot.baseContext.overrides);
    overrides.admin = {
      status: 'APPROVED',
      expiresAt: expiresAtIso,
    } as SaleContext['overrides']['admin'];

    const machineResult = runSaleMachine({
      status: snapshot.order.status,
      workflowState: snapshot.previousState,
      workflowContext: snapshot.previousContext ?? undefined,
      event: { type: 'ADMIN_OVERRIDE_APPROVED', expiresAt: expiresAtIso },
      contextOverrides: {
        ...snapshot.baseContext,
        overrides,
      },
    });

    await this.workflow.recordSaleTransition({
      orderId: snapshot.order.id,
      fromState: snapshot.previousState,
      toState: machineResult.state,
      event: 'override.admin.approved',
      context: toSaleContextPayload(
        machineResult.context,
      ) as Prisma.InputJsonValue,
      metadata: {
        overrideType: 'ADMIN',
        approvedBy: params.approvedBy ?? null,
        expiresAt: expiresAtIso,
      } as Prisma.InputJsonValue,
    });

    if (machineResult.state === 'CLEARED_FOR_FULFILMENT') {
      await this.maybeAdvanceOrderToFulfillment(snapshot.order.id);
    }
  }

  async grantCreditOverride(params: {
    saleOrderId: string;
    approvedAmount: number;
    approvedBy?: string | null;
    expiresAt?: Date | string | null;
  }): Promise<void> {
    const snapshot = await this.loadSaleWorkflowSnapshot(params.saleOrderId);
    const expiresAtIso = this.toIsoOrNull(params.expiresAt);
    const overrides = this.cloneOverrides(snapshot.baseContext.overrides);
    overrides.credit = {
      status: 'APPROVED',
      approvedAmount: params.approvedAmount,
      expiresAt: expiresAtIso,
    } as SaleContext['overrides']['credit'];

    const machineResult = runSaleMachine({
      status: snapshot.order.status,
      workflowState: snapshot.previousState,
      workflowContext: snapshot.previousContext ?? undefined,
      event: {
        type: 'CREDIT_OVERRIDE_APPROVED',
        approvedAmount: params.approvedAmount,
        expiresAt: expiresAtIso ?? undefined,
      },
      contextOverrides: {
        ...snapshot.baseContext,
        overrides,
      },
    });

    await this.workflow.recordSaleTransition({
      orderId: snapshot.order.id,
      fromState: snapshot.previousState,
      toState: machineResult.state,
      event: 'override.credit.approved',
      context: toSaleContextPayload(
        machineResult.context,
      ) as Prisma.InputJsonValue,
      metadata: {
        overrideType: 'CREDIT',
        approvedBy: params.approvedBy ?? null,
        approvedAmount: params.approvedAmount,
        expiresAt: expiresAtIso,
      } as Prisma.InputJsonValue,
    });

    if (machineResult.state === 'CLEARED_FOR_FULFILMENT') {
      await this.maybeAdvanceOrderToFulfillment(snapshot.order.id);
    }
  }

  async getSaleWorkflowSnapshot(orderId: string) {
    const snapshot = await this.loadSaleWorkflowSnapshot(orderId);
    const transitionLogs = await this.prisma.saleOrderTransitionLog.findMany({
      where: { saleOrderId: orderId },
      orderBy: { occurredAt: 'desc' },
    });
    const state =
      snapshot.order.phase === PrismaOrderPhase.QUOTATION
        ? 'QUOTATION_DRAFT'
        : (snapshot.previousState ?? saleStatusToState(snapshot.order.status));
    return {
      saleOrderId: snapshot.order.id,
      state,
      context: toSaleContextPayload(snapshot.baseContext),
      transitionLogs,
    };
  }

  async creditCheck(orderId: string) {
    const snapshot = await this.loadSaleWorkflowSnapshot(orderId);
    if (snapshot.order.phase === PrismaOrderPhase.QUOTATION) {
      return null;
    }
    const state =
      snapshot.order.workflowState &&
      snapshot.order.workflowState !== 'QUOTATION_DRAFT'
        ? (snapshot.order.workflowState as SaleWorkflowState)
        : saleStatusToState(snapshot.order.status);
    return {
      saleOrderId: snapshot.order.id,
      state,
      context: toSaleContextPayload(snapshot.baseContext),
      grandTotal:
        snapshot.baseContext.grandTotal ?? snapshot.order.totalAmount ?? 0,
      paid: snapshot.paid,
      outstanding: snapshot.overage,
      creditLimit: snapshot.baseContext.credit.limit ?? 0,
      creditExposure: snapshot.baseContext.credit.exposure ?? 0,
      canAdvanceByPayment: snapshot.canAdvanceByPayment,
      canAdvanceByCredit: snapshot.canAdvanceByCredit,
    };
  }

  async getSaleWorkflowContext(orderId: string) {
    const snapshot = await this.loadSaleWorkflowSnapshot(orderId);
    return toSaleContextPayload(snapshot.baseContext);
  }

  async getFulfilmentWorkflowSnapshot(orderId: string) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: orderId },
      include: {
        transitionLogs: { orderBy: { occurredAt: 'desc' } },
      },
    });
    if (!fulfillment) {
      return null;
    }
    const state =
      fulfillment.workflowState ?? fulfilmentStatusToState(fulfillment.status);
    const contextPayload = fulfillment.workflowContext
      ? toFulfilmentContextPayload(
          fulfillment.workflowContext as unknown as FulfilmentContext,
        )
      : toFulfilmentContextPayload({ saleOrderId: orderId });
    return {
      saleOrderId: orderId,
      fulfillmentId: fulfillment.id,
      state,
      context: contextPayload,
      transitionLogs: fulfillment.transitionLogs,
    };
  }

  async getFulfilmentWorkflowContext(orderId: string) {
    const snapshot = await this.getFulfilmentWorkflowSnapshot(orderId);
    if (!snapshot) {
      return toFulfilmentContextPayload({ saleOrderId: orderId });
    }
    return snapshot.context;
  }

  async createFulfillment(data: CreateFulfillmentInput) {
    const trimmedAddress = (data.deliveryAddress ?? '').trim() || null;

    if (data.type === 'DELIVERY' && !trimmedAddress) {
      throw new BadRequestException(
        'Delivery fulfillment requires a delivery address.',
      );
    }

    const fulfillment = await this.prisma.$transaction(async (trx) => {
      const created = await trx.fulfillment.create({
        data: {
          ...data,
          deliveryAddress: trimmedAddress,
          workflowState: 'ALLOCATING_STOCK',
          workflowContext: toFulfilmentContextPayload({
            saleOrderId: data.saleOrderId,
          }) as Prisma.InputJsonValue,
        },
      });

      await this.workflow.recordFulfilmentTransition({
        fulfillmentId: created.id,
        fromState: null,
        toState: 'ALLOCATING_STOCK',
        event: 'fulfilment.created_manual',
        context: toFulfilmentContextPayload({
          saleOrderId: created.saleOrderId,
        }) as Prisma.InputJsonValue,
        tx: trx,
      });

      await trx.saleOrder.update({
        where: { id: data.saleOrderId },
        data: {
          phase: OrderPhase.FULFILLMENT,
          fulfillmentType: data.type as PrismaFulfillmentType,
          deliveryAddress: trimmedAddress,
        },
      });

      return created;
    });

    await this.notificationService.createNotification(
      data.deliveryPersonnelId || data.saleOrderId,
      'FULFILLMENT_CREATED',
      `Fulfillment for order ${data.saleOrderId} created.`,
    );
    return fulfillment;
  }

  async updateFulfillmentPreferences(input: UpdateFulfillmentPreferencesInput) {
    const attemptAutoAdvance = input.attemptAutoAdvance ?? true;
    const requestedType =
      input.fulfillmentType !== undefined && input.fulfillmentType !== null
        ? (input.fulfillmentType as PrismaFulfillmentType)
        : undefined;
    const providedAddress =
      input.deliveryAddress !== undefined
        ? (input.deliveryAddress ?? '').trim()
        : undefined;

    await this.prisma.$transaction(async (trx) => {
      const order = await trx.saleOrder.findUnique({
        where: { id: input.saleOrderId },
        include: { fulfillment: true },
      });
      if (!order) {
        throw new NotFoundException('Sale order not found');
      }

      const currentTrimmedAddress = (order.deliveryAddress ?? '').trim();
      const nextType: PrismaFulfillmentType | null =
        requestedType !== undefined
          ? requestedType
          : (order.fulfillmentType ?? null);

      let nextAddress: string | null;
      if (nextType === PrismaFulfillmentType.DELIVERY) {
        const candidate =
          providedAddress !== undefined
            ? providedAddress
            : currentTrimmedAddress;
        nextAddress = candidate ? candidate : null;
      } else {
        nextAddress = null;
      }

      if (nextType === PrismaFulfillmentType.DELIVERY && !nextAddress) {
        throw new BadRequestException(
          'Delivery orders require a delivery address.',
        );
      }

      const saleOrderUpdate: Prisma.SaleOrderUpdateInput = {};
      if (requestedType !== undefined && nextType !== order.fulfillmentType) {
        saleOrderUpdate.fulfillmentType = nextType;
      }
      if (nextAddress !== currentTrimmedAddress) {
        saleOrderUpdate.deliveryAddress = nextAddress;
      }

      if (Object.keys(saleOrderUpdate).length) {
        await trx.saleOrder.update({
          where: { id: order.id },
          data: saleOrderUpdate,
        });
      }

      if (order.fulfillment) {
        const fulfilmentUpdate: Prisma.FulfillmentUpdateInput = {};
        if (
          requestedType !== undefined &&
          nextType !== order.fulfillment.type &&
          order.fulfillment.status !== FulfillmentStatus.PENDING
        ) {
          throw new BadRequestException(
            'Cannot change fulfillment type once fulfillment has progressed.',
          );
        }

        if (
          providedAddress !== undefined &&
          order.fulfillment.status !== FulfillmentStatus.PENDING &&
          order.fulfillment.status !== FulfillmentStatus.ASSIGNED
        ) {
          throw new BadRequestException(
            'Cannot change delivery address after fulfillment is in transit.',
          );
        }

        if (
          requestedType !== undefined &&
          nextType !== order.fulfillment.type &&
          order.fulfillment.status === FulfillmentStatus.PENDING
        ) {
          fulfilmentUpdate.type = nextType ?? PrismaFulfillmentType.PICKUP;
        }

        if (
          (nextType === PrismaFulfillmentType.DELIVERY &&
            nextAddress !== (order.fulfillment.deliveryAddress ?? null)) ||
          (nextType !== PrismaFulfillmentType.DELIVERY &&
            order.fulfillment.deliveryAddress)
        ) {
          fulfilmentUpdate.deliveryAddress = nextAddress;
        }

        if (Object.keys(fulfilmentUpdate).length) {
          await trx.fulfillment.update({
            where: { id: order.fulfillment.id },
            data: fulfilmentUpdate,
          });
        }
      }
    });

    if (attemptAutoAdvance) {
      await this.maybeAdvanceOrderToFulfillment(input.saleOrderId);
    }

    return this.prisma.saleOrder.findUnique({
      where: { id: input.saleOrderId },
    });
  }

  // Assign delivery personnel
  async assignFulfillmentPersonnel(params: {
    saleOrderId: string;
    deliveryPersonnelId: string;
  }) {
    const existing = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: params.saleOrderId },
      select: {
        id: true,
        status: true,
        workflowState: true,
        workflowContext: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Fulfillment not found');
    }
    const fromStatus = existing.status;
    const events = eventsForFulfilmentTransition(
      fromStatus,
      FulfillmentStatus.ASSIGNED,
    );
    if (!events.length) {
      throw new BadRequestException(
        `Invalid fulfillment transition ${fromStatus} -> ${FulfillmentStatus.ASSIGNED}`,
      );
    }
    const previousContext =
      existing.workflowContext && typeof existing.workflowContext === 'object'
        ? (existing.workflowContext as unknown as FulfilmentContext)
        : null;
    const previousState: FulfilState =
      (existing.workflowState as FulfilState | null) ??
      fulfilmentStatusToState(fromStatus);
    const machineResult = runFulfilmentMachine({
      status: fromStatus,
      workflowState: previousState,
      workflowContext: previousContext ?? undefined,
      events,
      contextOverrides: {
        saleOrderId: params.saleOrderId,
      },
    });
    if (!machineResult.changed) {
      throw new BadRequestException(
        `Invalid fulfillment transition ${fromStatus} -> ${FulfillmentStatus.ASSIGNED}`,
      );
    }
    const f = await this.prisma.fulfillment.update({
      where: { saleOrderId: params.saleOrderId },
      data: {
        deliveryPersonnelId: params.deliveryPersonnelId,
        status: FulfillmentStatus.ASSIGNED,
        workflowState: machineResult.state,
        workflowContext: toFulfilmentContextPayload(
          machineResult.context,
        ) as Prisma.InputJsonValue,
      },
    });
    await this.workflow.recordFulfilmentTransition({
      fulfillmentId: f.id,
      fromState: previousState,
      toState: machineResult.state,
      event: 'assign_personnel',
      context: toFulfilmentContextPayload(
        machineResult.context,
      ) as Prisma.InputJsonValue,
    });
    await this.phaseCoordinator.onFulfilmentStatusChanged(
      params.saleOrderId,
      FulfillmentStatus.ASSIGNED,
    );
    await this.notificationService.createNotification(
      params.deliveryPersonnelId,
      'FULFILLMENT_ASSIGNED',
      `You have been assigned to deliver order ${params.saleOrderId}.`,
    );
    return f;
  }

  // Update fulfillment status with simple transition enforcement; on DELIVERED apply stock and close order
  async updateFulfillmentStatus(params: {
    saleOrderId: string;
    status: FulfillmentStatus;
    confirmationPin?: string;
  }) {
    const f = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: params.saleOrderId },
      select: {
        id: true,
        status: true,
        workflowState: true,
        workflowContext: true,
        confirmationPin: true,
      },
    });
    if (!f) throw new NotFoundException('Fulfillment not found');
    const fromStatus = f.status;
    const toStatus = params.status;
    const events = eventsForFulfilmentTransition(fromStatus, toStatus);
    if (fromStatus !== toStatus && !events.length) {
      throw new BadRequestException(
        `Invalid fulfillment transition ${fromStatus} -> ${toStatus}`,
      );
    }
    let machineResult: ReturnType<typeof runFulfilmentMachine> | null = null;
    if (events.length) {
      const previousContext =
        f.workflowContext && typeof f.workflowContext === 'object'
          ? (f.workflowContext as unknown as FulfilmentContext)
          : null;
      const previousState: FulfilState =
        (f.workflowState as FulfilState | null) ??
        fulfilmentStatusToState(fromStatus);
      machineResult = runFulfilmentMachine({
        status: fromStatus,
        workflowState: previousState,
        workflowContext: previousContext ?? undefined,
        events,
        contextOverrides: {
          saleOrderId: params.saleOrderId,
        },
      });
      if (!machineResult.changed) {
        throw new BadRequestException(
          `Invalid fulfillment transition ${fromStatus} -> ${toStatus}`,
        );
      }
    }
    // On DELIVERED: if PIN set, require match
    if (toStatus === FulfillmentStatus.DELIVERED && f.confirmationPin) {
      if (
        !params.confirmationPin ||
        params.confirmationPin !== f.confirmationPin
      ) {
        throw new BadRequestException('Invalid or missing confirmation PIN');
      }
    }

    const updated = await this.prisma.fulfillment.update({
      where: { saleOrderId: params.saleOrderId },
      data: {
        status: params.status,
        ...(machineResult
          ? {
              workflowState: machineResult.state,
              workflowContext: toFulfilmentContextPayload(
                machineResult.context,
              ) as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    if (machineResult) {
      const previousState: FulfilState =
        (f.workflowState as FulfilState | null) ??
        fulfilmentStatusToState(fromStatus);
      await this.workflow.recordFulfilmentTransition({
        fulfillmentId: updated.id,
        fromState: previousState,
        toState: machineResult.state,
        event: `status.${toStatus.toLowerCase()}`,
        context: toFulfilmentContextPayload(
          machineResult.context,
        ) as Prisma.InputJsonValue,
      });
    }

    if (toStatus === FulfillmentStatus.DELIVERED) {
      // Apply stock deduction (and reserved release) similar to fulfillConsumerSale
      const order = await this.prisma.saleOrder.findUnique({
        where: { id: params.saleOrderId },
      });
      if (order) {
        let orderStatus = order.status;
        const cSale = await this.prisma.consumerSale.findFirst({
          where: { saleOrderId: order.id },
          include: { items: true },
        });
        if (cSale) {
          await this.prisma.stockMovement.create({
            data: {
              storeId: cSale.storeId,
              direction: MovementDirection.OUT,
              movementType: MovementType.SALE,
              referenceEntity: 'ConsumerSale',
              referenceId: cSale.id,
              items: {
                create: cSale.items.map((i) => ({
                  productVariantId: i.productVariantId,
                  quantity: i.quantity,
                })),
              },
            },
          });
          for (const item of cSale.items) {
            const existing = await this.prisma.stock.findFirst({
              where: {
                storeId: cSale.storeId,
                productVariantId: item.productVariantId,
              },
            });
            if (existing) {
              await this.prisma.stock.update({
                where: { id: existing.id },
                data: {
                  quantity: { decrement: item.quantity },
                  reserved: { decrement: item.quantity },
                },
              });
            }
          }
          if (orderStatus === SaleStatus.CANCELLED) {
            throw new BadRequestException(
              'Cannot mark a cancelled order as fulfilled',
            );
          }
          if (orderStatus !== SaleStatus.FULFILLED) {
            await this.prisma.saleOrder.update({
              where: { id: order.id },
              data: {
                status: SaleStatus.FULFILLED,
                phase: OrderPhase.FULFILLMENT,
              },
            });
            orderStatus = SaleStatus.FULFILLED;
          }
        } else {
          const rSale = await this.prisma.resellerSale.findFirst({
            where: { SaleOrderid: order.id },
            include: { items: true },
          });
          if (rSale) {
            await this.prisma.stockMovement.create({
              data: {
                storeId: rSale.storeId,
                direction: MovementDirection.OUT,
                movementType: MovementType.SALE,
                referenceEntity: 'ResellerSale',
                referenceId: rSale.id,
                items: {
                  create: rSale.items.map((i) => ({
                    productVariantId: i.productVariantId,
                    quantity: i.quantity,
                  })),
                },
              },
            });
            for (const item of rSale.items) {
              const existing = await this.prisma.stock.findFirst({
                where: {
                  storeId: rSale.storeId,
                  productVariantId: item.productVariantId,
                },
              });
              if (existing) {
                await this.prisma.stock.update({
                  where: { id: existing.id },
                  data: {
                    quantity: { decrement: item.quantity },
                    reserved: { decrement: item.quantity },
                  },
                });
              }
            }
            if (orderStatus === SaleStatus.CANCELLED) {
              throw new BadRequestException(
                'Cannot mark a cancelled order as fulfilled',
              );
            }
            if (orderStatus !== SaleStatus.FULFILLED) {
              await this.prisma.saleOrder.update({
                where: { id: order.id },
                data: {
                  status: SaleStatus.FULFILLED,
                  phase: OrderPhase.FULFILLMENT,
                },
              });
              orderStatus = SaleStatus.FULFILLED;
            }
          }
        }
      }
      await this.notificationService.createNotification(
        updated.deliveryPersonnelId || updated.saleOrderId,
        'FULFILLMENT_DELIVERED',
        `Order ${params.saleOrderId} delivered.`,
      );
    }

    await this.phaseCoordinator.onFulfilmentStatusChanged(
      params.saleOrderId,
      toStatus,
    );

    return updated;
  }

  private async reserveStockForOrder(orderId: string) {
    const cSale = await this.prisma.consumerSale.findFirst({
      where: { saleOrderId: orderId },
      include: { items: true },
    });
    if (cSale) {
      for (const item of cSale.items) {
        await this.prisma.stock.upsert({
          where: {
            storeId_productVariantId: {
              storeId: cSale.storeId,
              productVariantId: item.productVariantId,
            },
          },
          update: { reserved: { increment: item.quantity } },
          create: {
            storeId: cSale.storeId,
            productVariantId: item.productVariantId,
            quantity: 0,
            reserved: item.quantity,
          },
        });
      }
    }
    const rSale = await this.prisma.resellerSale.findFirst({
      where: { SaleOrderid: orderId },
      include: { items: true },
    });
    if (rSale) {
      for (const item of rSale.items) {
        await this.prisma.stock.upsert({
          where: {
            storeId_productVariantId: {
              storeId: rSale.storeId,
              productVariantId: item.productVariantId,
            },
          },
          update: { reserved: { increment: item.quantity } },
          create: {
            storeId: rSale.storeId,
            productVariantId: item.productVariantId,
            quantity: 0,
            reserved: item.quantity,
          },
        });
      }
    }
  }

  private async getEffectiveUnitPrice(
    variantId: string,
    saleType: SaleType,
    resellerId?: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new BadRequestException('Product variant not found');
    if (saleType === SaleType.CONSUMER) {
      const base = variant.price ?? 0;
      const markup = await this.systemSettings.getNumber(
        'CONSUMER_PRICE_MARKUP_PERCENT',
      );
      return Number((base * (1 + markup)).toFixed(2));
    }
    // reseller pricing
    if (!resellerId) return variant.resellerPrice;
    const profile = await this.prisma.resellerProfile.findUnique({
      where: { userId: resellerId },
    });
    if (!profile) return variant.resellerPrice;
    const { tier } = profile;
    const tierPrice = await this.prisma.productVariantTierPrice.findFirst({
      where: { productVariantId: variantId, tier },
    });
    return tierPrice?.price ?? variant.resellerPrice;
  }
}
