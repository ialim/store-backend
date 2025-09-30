import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { AnalyticsReadService } from './analytics.service';
import { VariantMonthlySales } from './types/variant-monthly-sales.type';
import { CustomerAffinityEntry } from './types/customer-affinity-entry.type';
import { MonthlySalesSummary } from './types/monthly-sales-summary.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VariantSalesWithDetails } from './types/variant-sales-with-details.type';

function currentMonth(): string {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return ym;
}

@Resolver()
export class AnalyticsResolver {
  private readonly read: AnalyticsReadService;
  constructor(private prisma: PrismaService) {
    this.read = new AnalyticsReadService(this.prisma);
  }

  @Query(() => [VariantMonthlySales])
  @UseGuards(GqlAuthGuard)
  topSellingVariants(
    @Args('month', { nullable: true }) month?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const m = month || currentMonth();
    const lim = limit ?? 10;
    return this.read.topSellingVariants({
      month: m,
      limit: lim,
    });
  }

  @Query(() => [CustomerAffinityEntry])
  @UseGuards(GqlAuthGuard)
  customerAffinity(
    @Args('customerId') customerId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const lim = limit ?? 10;
    return this.read.customerAffinity({ customerId, limit: lim });
  }

  @Query(() => MonthlySalesSummary)
  @UseGuards(GqlAuthGuard)
  monthlySalesSummary(@Args('month', { nullable: true }) month?: string) {
    const m = month || currentMonth();
    return this.read.monthlySalesSummary({ month: m });
  }

  // Detailed variants (with product info)
  @Query(() => [VariantSalesWithDetails])
  @UseGuards(GqlAuthGuard)
  async topSellingVariantsDetailed(
    @Args('month', { nullable: true }) month?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const m = month || currentMonth();
    const lim = limit ?? 10;
    const basic = await this.read.topSellingVariantsDetailed({
      month: m,
      limit: lim,
    });
    return this.read.enrichVariantDetails(basic);
  }

  @Query(() => [VariantSalesWithDetails])
  @UseGuards(GqlAuthGuard)
  async topSellingVariantsByStore(
    @Args('storeId') storeId: string,
    @Args('month', { nullable: true }) month?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    const m = month || currentMonth();
    const lim = limit ?? 10;
    const basic = await this.read.topSellingVariantsByStore({
      storeId,
      month: m,
      limit: lim,
    });
    return this.read.enrichVariantDetails(basic);
  }

  @Query(() => MonthlySalesSummary)
  @UseGuards(GqlAuthGuard)
  monthlySalesSummaryByStore(
    @Args('storeId') storeId: string,
    @Args('month', { nullable: true }) month?: string,
  ) {
    const m = month || currentMonth();
    return this.read.monthlySalesSummaryByStore({ storeId, month: m });
  }
}
