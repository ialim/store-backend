import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class FulfillPurchaseReturnInput {
  @Field()
  id!: string; // PurchaseReturn.id
}
