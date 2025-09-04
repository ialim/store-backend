import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class PurchaseOrderItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field(() => Float)
  quantity: number;

  @Field(() => Float)
  unitCost: number;
}
