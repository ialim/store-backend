import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class StorePaymentsSummary {
  @Field()
  storeId!: string;

  @Field()
  month!: string;

  @Field(() => Float)
  consumerPaid!: number;

  @Field(() => Float)
  resellerPaid!: number;

  @Field(() => Float)
  totalPaid!: number;
}
