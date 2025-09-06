import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class SupplierCatalogEntry {
  @Field()
  supplierId!: string;

  @Field()
  productVariantId!: string;

  @Field(() => Float)
  defaultCost!: number;

  @Field(() => Int, { nullable: true })
  leadTimeDays?: number | null;

  @Field(() => Boolean, { nullable: true })
  isPreferred?: boolean | null;
}
