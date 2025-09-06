import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SupplierCatalogEntry {
  @Field()
  supplierId!: string;

  @Field()
  productVariantId!: string;

  @Field()
  defaultCost!: number;

  @Field({ nullable: true })
  leadTimeDays?: number | null;

  @Field({ nullable: true })
  isPreferred?: boolean | null;
}
