import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class BillerConvertQuotationInput {
  @Field(() => ID)
  quotationId: string;

  @Field(() => ID)
  billerId: string;
}

