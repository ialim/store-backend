import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class QueryStockInput {
  @Field(() => ID, { nullable: true })
  storeId?: string;

  @Field(() => ID, { nullable: true })
  productVariantId?: string;
}
