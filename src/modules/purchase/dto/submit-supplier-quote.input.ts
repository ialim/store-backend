import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SupplierQuoteItemInput {
  @Field()
  productVariantId: string;

  @Field()
  unitCost: number;

  @Field({ nullable: true })
  minQty?: number;

  @Field({ nullable: true })
  leadTimeDays?: number;
}

@InputType()
export class SubmitSupplierQuoteInput {
  @Field()
  requisitionId: string;

  @Field()
  supplierId: string;

  @Field(() => [SupplierQuoteItemInput])
  items: SupplierQuoteItemInput[];

  @Field({ nullable: true })
  validUntil?: Date;

  @Field({ nullable: true })
  notes?: string;
}
