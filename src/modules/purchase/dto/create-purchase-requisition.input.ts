import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreatePurchaseRequisitionItemInput {
  @Field()
  productVariantId: string;

  @Field()
  requestedQty: number;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class CreatePurchaseRequisitionInput {
  @Field()
  storeId: string;

  @Field()
  requestedById: string;

  @Field(() => [CreatePurchaseRequisitionItemInput])
  items: CreatePurchaseRequisitionItemInput[];
}
