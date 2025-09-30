import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CheckoutConsumerQuotationInput {
  @Field(() => ID)
  quotationId: string;

  @Field(() => ID)
  billerId: string;
}
