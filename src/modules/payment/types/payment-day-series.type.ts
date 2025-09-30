import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class PaymentDaySeries {
  @Field()
  date!: string; // YYYY-MM-DD (UTC)

  @Field(() => Float)
  consumerPaid!: number;

  @Field(() => Float)
  resellerPaid!: number;

  @Field(() => Float)
  totalPaid!: number;
}
