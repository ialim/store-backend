import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { PaymentMethod } from '../../../shared/prismagraphql/prisma/payment-method.enum';

@ObjectType()
export class PaymentMethodBreakdownEntry {
  @Field(() => PaymentMethod)
  method!: keyof typeof PaymentMethod;

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

