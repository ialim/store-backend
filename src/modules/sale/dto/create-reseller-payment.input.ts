import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { PaymentMethod } from '../../../shared/prismagraphql/prisma/payment-method.enum';

@InputType()
export class CreateResellerPaymentInput {
  @Field(() => ID)
  saleOrderId: string;

  @Field(() => ID)
  resellerId: string;

  @Field(() => ID, { nullable: true })
  resellerSaleId?: string;

  @Field(() => Float)
  amount: number;

  @Field(() => PaymentMethod)
  method: PaymentMethod;

  @Field({ nullable: true })
  reference?: string;

  @Field(() => ID)
  receivedById: string;
}
