import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SetReorderSettingsInput {
  @Field()
  storeId: string;

  @Field()
  productVariantId: string;

  @Field(() => Int, { nullable: true })
  reorderPoint?: number | null;

  @Field(() => Int, { nullable: true })
  reorderQty?: number | null;
}
