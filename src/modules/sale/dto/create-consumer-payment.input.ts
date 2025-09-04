import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { PaymentMethod } from '../../../shared/prismagraphql/prisma/payment-method.enum';

@InputType()
export class CreateConsumerPaymentInput {
  @Field(() => ID)
  saleOrderId: string;

  @Field(() => ID)
  consumerSaleId: string;

  @Field(() => Float)
  amount: number;

  @Field(() => PaymentMethod)
  method: PaymentMethod;

  @Field({ nullable: true })
  reference?: string;
}
