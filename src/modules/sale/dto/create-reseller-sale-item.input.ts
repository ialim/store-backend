import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class CreateResellerSaleItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field(() => Float)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;
}
