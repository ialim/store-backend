import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';

@InputType()
export class CreateQuotationItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;
}
