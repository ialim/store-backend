import { ObjectType, Field, ID } from '@nestjs/graphql';
import { SupplierQuoteSummary } from './supplier-quote-summary.type';

@ObjectType()
export class RfqDashboard {
  @Field(() => ID, { nullable: true })
  requisitionId?: string | null;

  @Field()
  draft!: number;

  @Field()
  submitted!: number;

  @Field()
  selected!: number;

  @Field()
  rejected!: number;

  @Field()
  total!: number;

  @Field(() => [SupplierQuoteSummary])
  pendingQuotes!: SupplierQuoteSummary[];
}

