import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PurchaseOrderReceiptProgress {
  @Field(() => String)
  productVariantId!: string;

  @Field(() => Int)
  orderedQty!: number;

  @Field(() => Int)
  receivedQty!: number;
}
