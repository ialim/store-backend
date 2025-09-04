import { InputType, Field, ID } from '@nestjs/graphql';
import { Int } from '@nestjs/graphql';

@InputType()
export class TransferStockItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field(() => Int)
  quantity: number;
}

@InputType()
export class TransferStockInput {
  @Field(() => ID)
  fromStoreId: string;

  @Field(() => ID)
  toStoreId: string;

  @Field(() => ID)
  requestedById: string;

  @Field(() => ID)
  approvedById: string;

  @Field(() => [TransferStockItemInput])
  items: TransferStockItemInput[];
}
