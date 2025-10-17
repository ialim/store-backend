import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalesService } from '../sale/sale.service';
import { CreateQuotationDraftInput } from '../sale/dto/create-quotation-draft.input';
import { UpdateQuotationStatusInput } from '../sale/dto/update-quotation-status.input';
import { CreateConsumerPaymentInput } from '../sale/dto/create-consumer-payment.input';
import { CreateResellerPaymentInput } from '../sale/dto/create-reseller-payment.input';
import { ConfirmConsumerPaymentInput } from '../sale/dto/confirm-consumer-payment.input';
import { UpdateQuotationInput } from '../sale/dto/update-quotation.input';
import { AuthenticatedUser } from '../auth/auth.service';
import { Prisma, FulfillmentStatus } from '@prisma/client';
import {
  QuotationViewContext,
  QuotationPartyInfo,
  QuotationStoreInfo,
} from './dto/quotation-context.model';
import { GrantAdminOverrideInput } from './dto/grant-admin-override.input';
import { GrantCreditOverrideInput } from './dto/grant-credit-override.input';
import { QuotationStatus } from '../../shared/prismagraphql/prisma/quotation-status.enum';
import { SaleType } from '../../shared/prismagraphql/prisma/sale-type.enum';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private sales: SalesService,
  ) {}

  private isReseller(user?: AuthenticatedUser | null): boolean {
    return (user?.role?.name || '').toUpperCase() === 'RESELLER';
  }

  private orderScopeForUser(
    user?: AuthenticatedUser | null,
  ): Prisma.SaleOrderWhereInput | undefined {
    if (!this.isReseller(user)) {
      return undefined;
    }
    return {
      OR: [
        { quotation: { resellerId: user?.id } },
        { resellerSale: { resellerId: user?.id } },
        { ResellerPayment: { some: { resellerId: user?.id } } },
      ],
    };
  }

  private async assertQuotationOwnedByUser(
    quotationId: string,
    user?: AuthenticatedUser | null,
  ) {
    if (!this.isReseller(user)) {
      return;
    }
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { resellerId: true },
    });
    if (!quotation || quotation.resellerId !== user?.id) {
      throw new NotFoundException('Quotation not found');
    }
  }

  // Queries
  async orders(user?: AuthenticatedUser | null) {
    return this.prisma.saleOrder.findMany({
      where: this.orderScopeForUser(user),
      include: {
        fulfillment: true,
        transitionLogs: { orderBy: { occurredAt: 'desc' } },
        quotation: { include: { items: true } },
        consumerSale: {
          include: {
            store: true,
            customer: true,
            biller: { include: { customerProfile: true } },
          },
        },
        resellerSale: {
          include: {
            items: true,
            biller: { include: { customerProfile: true } },
            reseller: { include: { customerProfile: true } },
            store: true,
          },
        },
        ResellerPayment: true,
        biller: { include: { customerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async order(id: string, user?: AuthenticatedUser | null) {
    const o = await this.prisma.saleOrder.findUnique({
      where: { id },
      include: {
        fulfillment: true,
        transitionLogs: { orderBy: { occurredAt: 'desc' } },
        quotation: { include: { items: true } },
        consumerSale: {
          include: {
            store: true,
            customer: true,
            biller: { include: { customerProfile: true } },
          },
        },
        resellerSale: {
          include: {
            items: true,
            biller: { include: { customerProfile: true } },
            reseller: { include: { customerProfile: true } },
            store: true,
          },
        },
        ResellerPayment: true,
        biller: { include: { customerProfile: true } },
      },
    });
    if (!o) {
      throw new NotFoundException('Order not found');
    }
    if (this.isReseller(user)) {
      const ownsQuotation = o.quotation?.resellerId === user?.id;
      const ownsSale = o.resellerSale?.resellerId === user?.id;
      const ownsPayment = (o.ResellerPayment ?? []).some(
        (payment) => payment.resellerId === user?.id,
      );
      if (!ownsQuotation && !ownsSale && !ownsPayment) {
        throw new NotFoundException('Order not found');
      }
    }
    return o;
  }

  async quotations(user?: AuthenticatedUser | null) {
    if (this.isReseller(user)) {
      return this.prisma.quotation.findMany({
        where: { resellerId: user?.id },
        include: { items: true, SaleOrder: true, biller: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.sales.quotations();
  }

  async quotation(id: string, user?: AuthenticatedUser | null) {
    if (this.isReseller(user)) {
      const quotation = await this.prisma.quotation.findFirst({
        where: { id, resellerId: user?.id },
        include: { items: true, SaleOrder: true, biller: true },
      });
      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }
      return quotation;
    }
    return this.sales.quotation(id);
  }

  async consumerSales() {
    return this.sales.consumerSales();
  }

  async consumerSale(id: string) {
    return this.sales.consumerSale(id);
  }

  async resellerSales(user?: AuthenticatedUser | null) {
    if (this.isReseller(user)) {
      return this.prisma.resellerSale.findMany({
        where: { resellerId: user?.id },
        include: {
          items: true,
          SaleOrder: true,
          biller: { include: { customerProfile: true } },
          reseller: { include: { customerProfile: true } },
          store: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.sales.resellerSales();
  }

  async resellerSale(id: string, user?: AuthenticatedUser | null) {
    if (this.isReseller(user)) {
      const sale = await this.prisma.resellerSale.findFirst({
        where: { id, resellerId: user?.id },
        include: {
          items: true,
          SaleOrder: true,
          biller: { include: { customerProfile: true } },
          reseller: { include: { customerProfile: true } },
          store: true,
        },
      });
      if (!sale) {
        throw new NotFoundException('Reseller sale not found');
      }
      return sale;
    }
    return this.sales.resellerSale(id);
  }

  // Quotation lifecycle
  async createQuotationDraft(
    input: CreateQuotationDraftInput,
    user?: AuthenticatedUser | null,
  ) {
    if (this.isReseller(user)) {
      if (input.type !== SaleType.RESELLER) {
        throw new BadRequestException(
          'Resellers can only create RESELLER quotations',
        );
      }
      const data: CreateQuotationDraftInput = {
        ...input,
        resellerId: user?.id,
      };
      return this.sales.createQuotationDraft(data);
    }
    return this.sales.createQuotationDraft(input);
  }

  async updateQuotationStatus(
    input: UpdateQuotationStatusInput,
    user?: AuthenticatedUser | null,
  ) {
    await this.assertQuotationOwnedByUser(input.id, user);
    if (this.isReseller(user)) {
      const allowed =
        input.status === QuotationStatus.CONFIRMED ||
        input.status === QuotationStatus.REJECTED;
      if (!allowed) {
        throw new BadRequestException(
          'Resellers can only confirm or reject their quotations',
        );
      }
    }
    return this.sales.updateQuotationStatus(input);
  }

  async updateQuotation(
    input: UpdateQuotationInput,
    user?: AuthenticatedUser | null,
  ) {
    await this.assertQuotationOwnedByUser(input.id, user);
    if (this.isReseller(user)) {
      if (input.type && input.type !== SaleType.RESELLER) {
        throw new BadRequestException(
          'Resellers can only manage RESELLER quotations',
        );
      }
      if (input.resellerId && user?.id && input.resellerId !== user.id) {
        throw new BadRequestException(
          'Resellers cannot reassign quotations to other users',
        );
      }
      if (input.consumerId) {
        throw new BadRequestException(
          'Resellers cannot convert quotations to consumer sales',
        );
      }
    }
    return this.sales.updateQuotation(input);
  }

  // Payments
  registerConsumerPayment(input: CreateConsumerPaymentInput) {
    return this.sales.registerConsumerPayment(input);
  }

  confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    return this.sales.confirmConsumerPayment(input);
  }

  registerResellerPayment(input: CreateResellerPaymentInput) {
    return this.sales.registerResellerPayment(input);
  }

  confirmResellerPayment(paymentId: string) {
    return this.sales.confirmResellerPayment(paymentId);
  }

  // Admin
  adminRevertToQuotation(orderId: string) {
    return this.sales.adminRevertOrderToQuotation(orderId);
  }

  async grantAdminOverride(
    input: GrantAdminOverrideInput,
    user?: AuthenticatedUser | null,
  ) {
    await this.order(input.saleOrderId, user);
    await this.sales.grantAdminOverride({
      saleOrderId: input.saleOrderId,
      approvedBy: user?.id ?? null,
      expiresAt: input.expiresAt ?? null,
    });
    return this.order(input.saleOrderId, user);
  }

  async grantCreditOverride(
    input: GrantCreditOverrideInput,
    user?: AuthenticatedUser | null,
  ) {
    await this.order(input.saleOrderId, user);
    await this.sales.grantCreditOverride({
      saleOrderId: input.saleOrderId,
      approvedAmount: input.approvedAmount,
      approvedBy: user?.id ?? null,
      expiresAt: input.expiresAt ?? null,
    });
    return this.order(input.saleOrderId, user);
  }

  async saleWorkflow(saleOrderId: string, user?: AuthenticatedUser | null) {
    await this.order(saleOrderId, user);
    return this.sales.getSaleWorkflowSnapshot(saleOrderId);
  }

  async creditCheck(saleOrderId: string, user?: AuthenticatedUser | null) {
    await this.order(saleOrderId, user);
    return this.sales.creditCheck(saleOrderId);
  }

  async fulfilmentWorkflow(
    saleOrderId: string,
    user?: AuthenticatedUser | null,
  ) {
    await this.order(saleOrderId, user);
    return this.sales.getFulfilmentWorkflowSnapshot(saleOrderId);
  }

  async fulfillmentsInProgress(options: {
    statuses?: FulfillmentStatus[] | null;
    storeId?: string | null;
    search?: string | null;
    take?: number | null;
  }) {
    const statuses =
      options.statuses && options.statuses.length
        ? options.statuses
        : [
            FulfillmentStatus.PENDING,
            FulfillmentStatus.ASSIGNED,
            FulfillmentStatus.IN_TRANSIT,
          ];

    const where: Prisma.FulfillmentWhereInput = {
      status: { in: statuses },
    };

    if (options.storeId) {
      where.saleOrder = {
        is: {
          storeId: options.storeId,
        },
      };
    }

    if (options.search?.trim()) {
      const term = options.search.trim();
      where.OR = [
        { saleOrderId: { contains: term, mode: 'insensitive' } },
        {
          deliveryAddress: { contains: term, mode: 'insensitive' },
        },
      ];
    }

    const take = options.take && options.take > 0 ? options.take : 100;

    return this.prisma.fulfillment.findMany({
      where,
      include: {
        saleOrder: {
          select: {
            id: true,
            storeId: true,
            type: true,
            status: true,
            phase: true,
            totalAmount: true,
            biller: {
              select: {
                id: true,
                email: true,
                customerProfile: { select: { fullName: true } },
              },
            },
            consumerSale: {
              select: {
                id: true,
                store: { select: { id: true, name: true } },
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
            resellerSale: {
              select: {
                id: true,
                store: { select: { id: true, name: true } },
                reseller: {
                  select: {
                    id: true,
                    email: true,
                    customerProfile: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        },
        deliveryPersonnel: {
          select: {
            id: true,
            email: true,
            customerProfile: { select: { fullName: true } },
          },
        },
        riderInterests: {
          include: {
            rider: {
              select: {
                id: true,
                email: true,
                customerProfile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 250),
    });
  }

  async quotationContext(
    quotationId: string,
    user?: AuthenticatedUser | null,
  ): Promise<QuotationViewContext> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        store: { select: { id: true, name: true, location: true } },
        biller: {
          select: {
            id: true,
            email: true,
            customerProfile: { select: { fullName: true } },
          },
        },
        reseller: {
          select: {
            id: true,
            email: true,
            customerProfile: { select: { fullName: true } },
          },
        },
        consumer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    if (this.isReseller(user) && quotation.resellerId !== user?.id) {
      throw new NotFoundException('Quotation not found');
    }
    const store: QuotationStoreInfo | null = quotation.store
      ? {
          id: quotation.store.id,
          name: quotation.store.name,
          location: quotation.store.location,
        }
      : null;
    const biller: QuotationPartyInfo | null = quotation.biller
      ? {
          id: quotation.biller.id,
          email: quotation.biller.email,
          fullName: quotation.biller.customerProfile?.fullName || null,
        }
      : null;
    const reseller: QuotationPartyInfo | null = quotation.reseller
      ? {
          id: quotation.reseller.id,
          email: quotation.reseller.email,
          fullName: quotation.reseller.customerProfile?.fullName || null,
        }
      : null;
    const consumer: QuotationPartyInfo | null = quotation.consumer
      ? {
          id: quotation.consumer.id,
          email: quotation.consumer.email,
          fullName: quotation.consumer.fullName,
        }
      : null;
    return {
      store,
      biller,
      reseller,
      consumer,
    };
  }
}
