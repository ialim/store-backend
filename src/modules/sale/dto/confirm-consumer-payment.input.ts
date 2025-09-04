import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class ConfirmConsumerPaymentInput {
  @Field(() => ID)
  paymentId: string;
}
