import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class UpsertSupplierCatalogInput {
  @Field()
  supplierId: string;

  @Field()
  productVariantId: string;

  @Field(() => Float)
  defaultCost: number;

  @Field({ nullable: true })
  leadTimeDays?: number;

  @Field({ nullable: true })
  isPreferred?: boolean;
}

@InputType()
export class UpsertSupplierCatalogBulkInput {
  @Field(() => [UpsertSupplierCatalogInput])
  items: UpsertSupplierCatalogInput[];
}

