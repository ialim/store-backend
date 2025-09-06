import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class BillerPaymentsSummary {
  @Field()
  billerId!: string;

  @Field({ nullable: true })
  storeId?: string;

  @Field({ nullable: true })
  month?: string;

  @Field(() => Float)
  consumerPaid!: number;

  @Field(() => Float)
  resellerPaid!: number;

  @Field(() => Float)
  totalPaid!: number;

  @Field(() => Int)
  consumerCount!: number;

  @Field(() => Int)
  resellerCount!: number;
}

