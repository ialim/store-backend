import { InputType, Field, ID } from '@nestjs/graphql';
import { CreateResellerSaleItemInput } from './create-reseller-sale-item.input';

@InputType()
export class CreateResellerSaleInput {
  @Field(() => ID)
  storeId: string;

  @Field(() => ID)
  billerId: string;

  @Field(() => ID)
  resellerId: string;

  @Field(() => [CreateResellerSaleItemInput])
  items: CreateResellerSaleItemInput[];
}
