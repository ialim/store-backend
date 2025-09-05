import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class PurchaseSelectionItemInput {
  @Field()
  productVariantId: string;

  @Field()
  supplierId: string;

  @Field({ nullable: true })
  quantity?: number; // defaults to requisition requestedQty

  @Field({ nullable: true })
  unitCost?: number; // defaults to quote or supplier catalog
}

@InputType()
export class CreatePOsFromSelectionInput {
  @Field()
  requisitionId: string;

  @Field(() => [PurchaseSelectionItemInput])
  items: PurchaseSelectionItemInput[];

  @Field({ nullable: true })
  dueDate?: Date; // optional override (defaults to +30 days)
}

