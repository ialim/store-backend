import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxStatusCounts } from './types/outbox-status-counts.type';
import { OutboxTypeCount } from './types/outbox-type-count.type';
import { OutboxDayStatus } from './types/outbox-day-status.type';
import { GraphQLISODateTime } from '@nestjs/graphql';

@Resolver()
export class EventsResolver {
  constructor(
    private dispatcher: OutboxDispatcherService,
    private prisma: PrismaService,
  ) {}

  @Mutation(() => Number)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  processOutbox(
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
    @Args('type', { nullable: true }) type?: string,
    @Args('status', { nullable: true }) status?: 'PENDING' | 'FAILED',
  ) {
    return this.dispatcher.runOnce({ limit, type, status });
  }

  @Query(() => OutboxStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  async outboxStatus() {
    const [pending, failed, published] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'PENDING' as any } }),
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' as any } }),
      this.prisma.outboxEvent.count({ where: { status: 'PUBLISHED' as any } }),
    ]);
    return { pending, failed, published } as OutboxStatusCounts;
  }

  @Query(() => [OutboxTypeCount])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  async outboxStatusByType(
    @Args({ name: 'types', type: () => [String], nullable: true }) types?: string[],
  ) {
    let list = types;
    if (!list || !list.length) {
      const distinct = await this.prisma.outboxEvent.findMany({
        select: { type: true },
        distinct: ['type'],
        orderBy: { type: 'asc' },
        take: 50,
      });
      list = distinct.map((d) => d.type).filter(Boolean) as string[];
    }
    const results: OutboxTypeCount[] = [];
    for (const t of list) {
      const [pending, failed, published] = await Promise.all([
        this.prisma.outboxEvent.count({ where: { type: t, status: 'PENDING' as any } }),
        this.prisma.outboxEvent.count({ where: { type: t, status: 'FAILED' as any } }),
        this.prisma.outboxEvent.count({ where: { type: t, status: 'PUBLISHED' as any } }),
      ]);
      results.push({ type: t, pending, failed, published });
    }
    return results;
  }

  @Query(() => [OutboxDayStatus])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  async outboxStatusSeries(
    @Args('start', { type: () => GraphQLISODateTime }) start: Date,
    @Args('end', { type: () => GraphQLISODateTime }) end: Date,
    @Args('type', { nullable: true }) type?: string,
  ) {
    const where: any = { createdAt: { gte: start, lt: end } };
    if (type) where.type = type;
    const events = await this.prisma.outboxEvent.findMany({ where, select: { createdAt: true, status: true } });
    const map = new Map<string, { pending: number; failed: number; published: number }>();
    for (const evt of events) {
      const d = new Date(evt.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const entry = map.get(key) || { pending: 0, failed: 0, published: 0 };
      const st = String(evt.status);
      if (st === 'PENDING') entry.pending += 1;
      else if (st === 'FAILED') entry.failed += 1;
      else if (st === 'PUBLISHED') entry.published += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));
  }

  @Mutation(() => Number)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  async retryOutboxFailed(
    @Args('limit', { type: () => Number, nullable: true }) limit?: number,
    @Args('type', { nullable: true }) type?: string,
  ) {
    const where: any = { status: 'FAILED' as any };
    if (type) where.type = type;
    const failed = await this.prisma.outboxEvent.findMany({ where, orderBy: { createdAt: 'asc' }, take: limit ?? 100 });
    if (!failed.length) return 0;
    const ids = failed.map((f) => f.id);
    const results = await this.prisma.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PENDING' as any, lastError: null, deliverAfter: null },
    });
    return results.count || 0;
  }
}
