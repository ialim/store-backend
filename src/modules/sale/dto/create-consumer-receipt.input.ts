import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateConsumerReceiptInput {
  @Field(() => ID)
  consumerSaleId: string;

  @Field(() => ID)
  issuedById: string;

  @Field({ nullable: true })
  receiptUrl?: string;
}
