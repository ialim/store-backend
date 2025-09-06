import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class UpsertVariantSupplierCatalogInput {
  @Field()
  productVariantId: string;

  @Field()
  supplierId: string;

  @Field(() => Float)
  defaultCost: number;

  @Field({ nullable: true })
  leadTimeDays?: number;

  @Field({ nullable: true })
  isPreferred?: boolean;
}
