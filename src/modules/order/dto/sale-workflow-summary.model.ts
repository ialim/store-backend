import { Field, Float, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class SaleWorkflowSummary {
  @Field()
  saleOrderId!: string;

  @Field()
  state!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: any;

  @Field(() => Float)
  grandTotal!: number;

  @Field(() => Float)
  paid!: number;

  @Field(() => Float)
  outstanding!: number;

  @Field(() => Float)
  creditLimit!: number;

  @Field(() => Float)
  creditExposure!: number;

  @Field()
  canAdvanceByPayment!: boolean;

  @Field()
  canAdvanceByCredit!: boolean;
}
