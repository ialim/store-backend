import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreatePurchaseReturnItemInput {
  @Field()
  productVariantId!: string;

  @Field()
  batchId!: string; // StockReceiptBatch.id

  @Field(() => Int)
  quantity!: number;
}

@InputType()
export class CreatePurchaseReturnInput {
  @Field()
  supplierId!: string;

  @Field()
  initiatedById!: string;

  @Field()
  approvedById!: string; // current approval flow requires approver at creation

  @Field({ nullable: true })
  reason?: string;

  @Field(() => [CreatePurchaseReturnItemInput])
  items!: CreatePurchaseReturnItemInput[];
}
