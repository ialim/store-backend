import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentOrderSummary } from './types/payment-order-summary.type';
import { StorePaymentsSummary } from './types/store-payments-summary.type';
import { SupplierPaymentsSummary } from './types/supplier-payments-summary.type';
import { BillerPaymentsSummary } from './types/biller-payments-summary.type';
import { PaymentDaySeries } from './types/payment-day-series.type';
import { ConsumerPayment } from '../../shared/prismagraphql/consumer-payment/consumer-payment.model';
import { ResellerPayment } from '../../shared/prismagraphql/reseller-payment/reseller-payment.model';
import { SupplierPayment } from '../../shared/prismagraphql/supplier-payment/supplier-payment.model';

function monthWindow(month: string) {
  const [year, mm] = month.split('-').map((x) => Number(x));
  const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0));
  return { start, end };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Resolver()
export class PaymentResolver {
  constructor(private prisma: PrismaService) {}

  // Lists
  @Query(() => [ConsumerPayment])
  @UseGuards(GqlAuthGuard)
  consumerPaymentsByOrder(@Args('saleOrderId') saleOrderId: string) {
    return this.prisma.consumerPayment.findMany({
      where: { saleOrderId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  @Query(() => [ResellerPayment])
  @UseGuards(GqlAuthGuard)
  resellerPaymentsByOrder(@Args('saleOrderId') saleOrderId: string) {
    return this.prisma.resellerPayment.findMany({
      where: { saleOrderId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  @Query(() => [SupplierPayment])
  @UseGuards(GqlAuthGuard)
  supplierPaymentsByPO(@Args('purchaseOrderId') purchaseOrderId: string) {
    return this.prisma.supplierPayment.findMany({
      where: { purchaseOrderId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // Aggregates
  @Query(() => PaymentOrderSummary)
  @UseGuards(GqlAuthGuard)
  async orderPaymentSummary(@Args('saleOrderId') saleOrderId: string) {
    const order = await this.prisma.saleOrder.findUnique({
      where: { id: saleOrderId },
    });
    if (!order)
      return {
        saleOrderId,
        orderTotal: 0,
        consumerPaid: 0,
        resellerPaid: 0,
        totalPaid: 0,
        outstanding: 0,
        fullyPaid: false,
      };
    const [cAgg, rAgg] = await Promise.all([
      this.prisma.consumerPayment.aggregate({
        _sum: { amount: true },
        where: { saleOrderId, status: 'CONFIRMED' as any },
      }),
      this.prisma.resellerPayment.aggregate({
        _sum: { amount: true },
        where: { saleOrderId, status: 'CONFIRMED' as any },
      }),
    ]);
    const consumerPaid = cAgg._sum.amount || 0;
    const resellerPaid = rAgg._sum.amount || 0;
    const totalPaid = consumerPaid + resellerPaid;
    const outstanding = Math.max((order.totalAmount || 0) - totalPaid, 0);
    const fullyPaid = totalPaid >= (order.totalAmount || 0);
    return {
      saleOrderId,
      orderTotal: order.totalAmount,
      consumerPaid,
      resellerPaid,
      totalPaid,
      outstanding,
      fullyPaid,
    };
  }

  @Query(() => StorePaymentsSummary)
  @UseGuards(GqlAuthGuard)
  async storePaymentsSummary(
    @Args('storeId') storeId: string,
    @Args('month', { nullable: true }) month?: string,
  ) {
    const m = month || currentMonth();
    const { start, end } = monthWindow(m);
    const [cAgg, rAgg] = await Promise.all([
      this.prisma.consumerPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'CONFIRMED' as any,
          saleOrder: { storeId },
          receivedAt: { gte: start, lt: end } as any,
        } as any,
      }),
      this.prisma.resellerPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'CONFIRMED' as any,
          saleOrder: { storeId },
          receivedAt: { gte: start, lt: end } as any,
        } as any,
      }),
    ]);
    const consumerPaid = cAgg._sum.amount || 0;
    const resellerPaid = rAgg._sum.amount || 0;
    const totalPaid = consumerPaid + resellerPaid;
    return { storeId, month: m, consumerPaid, resellerPaid, totalPaid };
  }

  @Query(() => SupplierPaymentsSummary)
  @UseGuards(GqlAuthGuard)
  async supplierPaymentsSummary(
    @Args('supplierId') supplierId: string,
    @Args('month', { nullable: true }) month?: string,
  ) {
    const where: any = { supplierId };
    if (month) {
      const { start, end } = monthWindow(month);
      where.paymentDate = { gte: start, lt: end };
    }
    const [agg, last] = await Promise.all([
      this.prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where,
      }),
      this.prisma.supplierPayment.findFirst({
        where,
        orderBy: { paymentDate: 'desc' },
      }),
    ]);
    return {
      supplierId,
      month: month || undefined,
      totalPaid: agg._sum.amount || 0,
      count: agg._count._all || 0,
      lastPaymentDate: last?.paymentDate || null,
    } as SupplierPaymentsSummary;
  }

  @Query(() => BillerPaymentsSummary)
  @UseGuards(GqlAuthGuard)
  async billerPaymentsSummary(
    @Args('billerId') billerId: string,
    @Args('storeId', { nullable: true }) storeId?: string,
    @Args('month', { nullable: true }) month?: string,
  ) {
    const whereConsumer: any = { status: 'CONFIRMED' as any, saleOrder: { billerId } };
    const whereReseller: any = { status: 'CONFIRMED' as any, saleOrder: { billerId } };
    if (storeId) {
      whereConsumer.saleOrder.storeId = storeId;
      whereReseller.saleOrder.storeId = storeId;
    }
    if (month) {
      const { start, end } = monthWindow(month);
      whereConsumer.receivedAt = { gte: start, lt: end } as any;
      whereReseller.receivedAt = { gte: start, lt: end } as any;
    }
    const [cAgg, rAgg] = await Promise.all([
      this.prisma.consumerPayment.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: whereConsumer }),
      this.prisma.resellerPayment.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: whereReseller }),
    ]);
    const consumerPaid = cAgg._sum.amount || 0;
    const resellerPaid = rAgg._sum.amount || 0;
    const totalPaid = consumerPaid + resellerPaid;
    return {
      billerId,
      storeId: storeId || undefined,
      month: month || undefined,
      consumerPaid,
      resellerPaid,
      totalPaid,
      consumerCount: cAgg._count._all || 0,
      resellerCount: rAgg._count._all || 0,
    } as BillerPaymentsSummary;
  }

  @Query(() => [PaymentDaySeries])
  @UseGuards(GqlAuthGuard)
  async dailyPaymentsSeries(
    @Args('month', { nullable: true }) month?: string,
    @Args('storeId', { nullable: true }) storeId?: string,
    @Args('billerId', { nullable: true }) billerId?: string,
  ) {
    const m = month || currentMonth();
    const { start, end } = monthWindow(m);
    const whereConsumer: any = { status: 'CONFIRMED' as any, receivedAt: { gte: start, lt: end } };
    const whereReseller: any = { status: 'CONFIRMED' as any, receivedAt: { gte: start, lt: end } };
    if (storeId) {
      whereConsumer.saleOrder = { ...(whereConsumer.saleOrder || {}), storeId };
      whereReseller.saleOrder = { ...(whereReseller.saleOrder || {}), storeId };
    }
    if (billerId) {
      whereConsumer.saleOrder = { ...(whereConsumer.saleOrder || {}), billerId };
      whereReseller.saleOrder = { ...(whereReseller.saleOrder || {}), billerId };
    }
    const [consumerPayments, resellerPayments] = await Promise.all([
      this.prisma.consumerPayment.findMany({ where: whereConsumer, select: { amount: true, receivedAt: true } }),
      this.prisma.resellerPayment.findMany({ where: whereReseller, select: { amount: true, receivedAt: true } }),
    ]);
    const map = new Map<string, { consumer: number; reseller: number }>();
    for (const p of consumerPayments) {
      const d = new Date(p.receivedAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const entry = map.get(key) || { consumer: 0, reseller: 0 };
      entry.consumer += p.amount || 0;
      map.set(key, entry);
    }
    for (const p of resellerPayments) {
      const d = new Date(p.receivedAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const entry = map.get(key) || { consumer: 0, reseller: 0 };
      entry.reseller += p.amount || 0;
      map.set(key, entry);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({ date: k, consumerPaid: map.get(k)!.consumer, resellerPaid: map.get(k)!.reseller, totalPaid: map.get(k)!.consumer + map.get(k)!.reseller }));
  }
}
