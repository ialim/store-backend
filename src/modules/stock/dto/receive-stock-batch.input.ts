import { InputType, Field, ID } from '@nestjs/graphql';
import { Int } from '@nestjs/graphql';

@InputType()
export class ReceiveStockBatchItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field(() => Int)
  quantity: number;
}

@InputType()
export class ReceiveStockBatchInput {
  @Field(() => ID)
  purchaseOrderId: string;

  @Field(() => ID)
  storeId: string;

  @Field(() => ID)
  receivedById: string;

  @Field(() => ID)
  confirmedById: string;

  @Field({ nullable: true })
  waybillUrl?: string;

  @Field(() => [ReceiveStockBatchItemInput])
  items: ReceiveStockBatchItemInput[];
}
