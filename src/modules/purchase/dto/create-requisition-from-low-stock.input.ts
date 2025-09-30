import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateRequisitionFromLowStockInput {
  @Field()
  storeId: string;

  @Field()
  requestedById: string;
}
