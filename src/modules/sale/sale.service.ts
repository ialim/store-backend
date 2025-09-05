import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateConsumerSaleInput } from './dto/create-consumer-sale.input';
import { CreateResellerSaleInput } from './dto/create-reseller-sale.input';
import { SaleStatus } from '../../shared/prismagraphql/prisma/sale-status.enum';
import { UpdateQuotationStatusInput } from './dto/update-quotation-status.input';
// import { QuotationCreateInput } from '../../shared/prismagraphql/quotation';
import { SaleType } from 'src/shared/prismagraphql/prisma/sale-type.enum';
// After prisma generate, prefer importing OrderPhase enum
import { CreateConsumerPaymentInput } from './dto/create-consumer-payment.input';
import { PaymentStatus } from '../../shared/prismagraphql/prisma/payment-status.enum';
import { ConfirmConsumerPaymentInput } from './dto/confirm-consumer-payment.input';
import { CreateConsumerReceiptInput } from './dto/create-consumer-receipt.input';
import { MovementDirection } from 'src/shared/prismagraphql/prisma/movement-direction.enum';
import { MovementType } from 'src/shared/prismagraphql/prisma/movement-type.enum';
import { CreateFulfillmentInput } from './dto/create-fulfillment.input';
import { CreateResellerPaymentInput } from './dto/create-reseller-payment.input';
import { SaleChannel } from 'src/shared/prismagraphql/prisma/sale-channel.enum';
import { QuotationStatus } from 'src/shared/prismagraphql/prisma/quotation-status.enum';
import { CreateQuotationDraftInput } from './dto/create-quotation-draft.input';
import { CheckoutConsumerQuotationInput } from './dto/checkout-consumer-quotation.input';
import { ConfirmResellerQuotationInput } from './dto/confirm-reseller-quotation.input';
import { BillerConvertQuotationInput } from './dto/biller-convert-quotation.input';
import { FulfillConsumerSaleInput } from './dto/fulfill-consumer-sale.input';
import { DomainEventsService } from '../events/services/domain-events.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private domainEvents: DomainEventsService,
  ) {}

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
    const total = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    // Create a SaleOrder up-front so order lifecycle starts in QUOTATION phase
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: input.storeId,
        billerId: input.billerId || input.resellerId || input.consumerId || '',
        type: input.type,
        status: SaleStatus.PENDING,
        phase: 'QUOTATION',
        totalAmount: total,
      },
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
          create: input.items.map((i) => ({
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
      await this.domainEvents.publish(
        'QUOTATION_DRAFT_CREATED',
        {
          quotationId: q.id,
          notifications: [
            {
              userId: q.billerId,
              type: 'QUOTATION_DRAFT_CREATED',
              message: `Quotation ${q.id} created (draft).`,
            },
          ],
        },
        { aggregateType: 'Quotation', aggregateId: q.id },
      );
    }
    return q;
  }

  async updateQuotationStatus(input: UpdateQuotationStatusInput) {
    const current = await this.prisma.quotation.findUnique({
      where: { id: input.id },
      include: { items: true, SaleOrder: true },
    });
    if (!current) throw new NotFoundException('Quotation not found');

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
        await this.domainEvents.publish(
          'QUOTATION_CONFIRMED',
          {
            quotationId: q.id,
            notifications: [
              {
                userId: notify,
                type: 'QUOTATION_CONFIRMED',
                message: `Quotation ${q.id} confirmed.`,
              },
            ],
          },
          { aggregateType: 'Quotation', aggregateId: q.id },
        );
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
            phase: 'SALE',
            totalAmount: total,
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
          data: { phase: 'SALE' },
        });
      }

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
        await this.domainEvents.publish(
          'ORDER_ENTERED_SALE_PHASE',
          {
            orderId: q.saleOrderId,
            notifications: [
              {
                userId: q.billerId,
                type: 'ORDER_ENTERED_SALE_PHASE',
                message: `Order ${q.saleOrderId} approved; awaiting payment/credit check.`,
              },
            ],
          },
          {
            aggregateType: 'SaleOrder',
            aggregateId: q.saleOrderId || undefined,
          },
        );
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
        await this.domainEvents.publish(
          'SALE_PHASE_NOTIFICATION',
          {
            orderId: q.saleOrderId,
            notifications: [
              {
                userId: store.managerId,
                type: 'SALE_PHASE_NOTIFICATION',
                message: `Order ${q.saleOrderId} is in sale phase for store ${store.name}.`,
              },
            ],
          },
          {
            aggregateType: 'SaleOrder',
            aggregateId: q.saleOrderId || undefined,
          },
        );
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
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    if (q.type !== SaleType.CONSUMER) {
      throw new BadRequestException('Quotation is not a CONSUMER quotation');
    }
    if (!q.consumerId) {
      throw new BadRequestException('Quotation missing consumerId');
    }
    const total = q.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: q.storeId,
        billerId: input.billerId,
        type: SaleType.CONSUMER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
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
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: q.storeId,
        billerId: input.billerId,
        type: SaleType.RESELLER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
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
    return this.prisma.consumerSale.findMany({ include: { items: true } });
  }

  async consumerSale(id: string) {
    const sale = await this.prisma.consumerSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Consumer sale not found');
    return sale;
  }

  async createConsumerSale(data: CreateConsumerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.CONSUMER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
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
    const payment = await this.prisma.consumerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        consumerSaleId: data.consumerSaleId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
        reference: data.reference || undefined,
      },
    });
    await this.notificationService.createNotification(
      payment.saleOrderId,
      'CONSUMER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmConsumerPayment(input: ConfirmConsumerPaymentInput) {
    const payment = await this.prisma.consumerPayment.update({
      where: { id: input.paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });
    await this.domainEvents.publish(
      'PAYMENT_CONFIRMED',
      {
        paymentId: payment.id,
        saleOrderId: payment.saleOrderId,
        channel: 'CONSUMER',
      },
      { aggregateType: 'Payment', aggregateId: payment.id },
    );
    await this.maybeAdvanceOrderToFulfillment(payment.saleOrderId);
    return payment;
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
          id: undefined,
          AND: [
            {
              storeId: sale.storeId,
            },
            { productVariantId: item.productVariantId },
          ],
        },
        update: { quantity: { decrement: item.quantity } },
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
    await this.prisma.saleOrder.update({
      where: { id: sale.saleOrderId },
      data: { status: SaleStatus.FULFILLED, phase: 'FULFILLMENT' },
    });
    await this.notificationService.createNotification(
      updated.billerId,
      'CONSUMER_SALE_FULFILLED',
      `Sale ${updated.id} fulfilled.`,
    );
    await this.domainEvents.publish(
      'CONSUMER_SALE_FULFILLED',
      {
        saleId: updated.id,
        notifications: [
          {
            userId: updated.billerId,
            type: 'CONSUMER_SALE_FULFILLED',
            message: `Sale ${updated.id} fulfilled.`,
          },
        ],
      },
      { aggregateType: 'ConsumerSale', aggregateId: updated.id },
    );
    return updated;
  }

  // Reseller Sales
  async resellerSales() {
    return this.prisma.resellerSale.findMany({ include: { items: true } });
  }

  async resellerSale(id: string) {
    const sale = await this.prisma.resellerSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Reseller sale not found');
    return sale;
  }

  async createResellerSale(data: CreateResellerSaleInput) {
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = await this.prisma.saleOrder.create({
      data: {
        storeId: data.storeId,
        billerId: data.billerId,
        type: SaleType.RESELLER,
        status: SaleStatus.PENDING,
        totalAmount: total,
      },
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
    const payment = await this.prisma.resellerPayment.create({
      data: {
        saleOrderId: data.saleOrderId,
        resellerId: data.resellerId,
        resellerSaleId: data.resellerSaleId,
        amount: data.amount,
        method: data.method,
        status: PaymentStatus.PENDING,
        reference: data.reference || undefined,
        receivedById: data.receivedById,
      },
    });
    await this.notificationService.createNotification(
      data.receivedById,
      'RESELLER_PAYMENT_REGISTERED',
      `Payment ${payment.id} registered.`,
    );
    return payment;
  }

  async confirmResellerPayment(paymentId: string) {
    const payment = await this.prisma.resellerPayment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });
    await this.domainEvents.publish(
      'PAYMENT_CONFIRMED',
      {
        paymentId: payment.id,
        saleOrderId: payment.saleOrderId,
        channel: 'RESELLER',
      },
      { aggregateType: 'Payment', aggregateId: payment.id },
    );
    await this.maybeAdvanceOrderToFulfillment(payment.saleOrderId);
    return payment;
  }

  // Utility: evaluate payments/credit and advance to fulfillment if eligible
  private async maybeAdvanceOrderToFulfillment(orderId: string) {
    const order = await this.prisma.saleOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.phase !== 'SALE') return; // Only advance from SALE phase

    // Sum confirmed payments for this order
    const [consumerPaid, resellerPaid] = await Promise.all([
      this.prisma.consumerPayment.aggregate({
        _sum: { amount: true },
        where: { saleOrderId: orderId, status: PaymentStatus.CONFIRMED },
      }),
      this.prisma.resellerPayment.aggregate({
        _sum: { amount: true },
        where: { saleOrderId: orderId, status: PaymentStatus.CONFIRMED },
      }),
    ]);
    const paid =
      (consumerPaid._sum.amount || 0) + (resellerPaid._sum.amount || 0);

    let canAdvance = paid >= order.totalAmount;

    if (!canAdvance && order.type === SaleType.RESELLER) {
      // Check reseller credit availability
      const rSale = await this.prisma.resellerSale.findFirst({
        where: { SaleOrderid: orderId },
      });
      if (rSale) {
        const profile = await this.prisma.resellerProfile.findUnique({
          where: { userId: rSale.resellerId },
        });
        if (profile) {
          const unpaidPortion = Math.max(order.totalAmount - paid, 0);
          const projected = profile.outstandingBalance + unpaidPortion;
          if (projected <= profile.creditLimit) {
            canAdvance = true;
            // Allocate credit for unpaid portion
            await this.prisma.resellerProfile.update({
              where: { userId: rSale.resellerId },
              data: { outstandingBalance: projected },
            });
          }
        }
      }
    }

    if (!canAdvance) return;

    // Update order status if fully paid
    if (paid >= order.totalAmount) {
      await this.prisma.saleOrder.update({
        where: { id: orderId },
        data: { status: SaleStatus.PAID },
      });
    }

    // Enter fulfillment phase and create Fulfillment if missing
    await this.prisma.saleOrder.update({
      where: { id: orderId },
      data: { phase: 'FULFILLMENT' },
    });
    const existing = await this.prisma.fulfillment.findUnique({
      where: { saleOrderId: orderId },
    });
    if (!existing) {
      await this.prisma.fulfillment.create({
        data: {
          saleOrderId: orderId,
          type: 'PICKUP',
          status: 'PENDING',
        },
      });
    }

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
        await this.domainEvents.publish(
          'FULFILLMENT_REQUESTED',
          {
            orderId,
            notifications: [
              {
                userId: store.managerId,
                type: 'FULFILLMENT_REQUESTED',
                message: `Order ${orderId} ready for fulfillment at store ${store.name}.`,
              },
            ],
          },
          { aggregateType: 'SaleOrder', aggregateId: orderId },
        );
      }
      await this.notificationService.createNotification(
        so.billerId,
        'ORDER_ADVANCED_TO_FULFILLMENT',
        `Order ${orderId} advanced to fulfillment phase.`,
      );
      await this.domainEvents.publish(
        'ORDER_ADVANCED_TO_FULFILLMENT',
        {
          orderId,
          notifications: [
            {
              userId: so.billerId,
              type: 'ORDER_ADVANCED_TO_FULFILLMENT',
              message: `Order ${orderId} advanced to fulfillment phase.`,
            },
          ],
        },
        { aggregateType: 'SaleOrder', aggregateId: orderId },
      );
    }
  }

  // Admin action: revert order back to QUOTATION phase for modification
  async adminRevertOrderToQuotation(orderId: string) {
    const order = await this.prisma.saleOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

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

  async createFulfillment(data: CreateFulfillmentInput) {
    const f = await this.prisma.fulfillment.create({ data });
    await this.notificationService.createNotification(
      data.deliveryPersonnelId || data.saleOrderId,
      'FULFILLMENT_CREATED',
      `Fulfillment for order ${data.saleOrderId} created.`,
    );
    return f;
  }
}
