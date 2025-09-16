import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class PaymentOrderSummary {
  @Field()
  saleOrderId!: string;

  @Field(() => Float)
  orderTotal!: number;

  @Field(() => Float)
  consumerPaid!: number;

  @Field(() => Float)
  resellerPaid!: number;

  @Field(() => Float)
  totalPaid!: number;

  @Field(() => Float)
  outstanding!: number;

  @Field()
  fullyPaid!: boolean;
}
