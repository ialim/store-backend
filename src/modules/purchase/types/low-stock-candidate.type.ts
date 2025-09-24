import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class LowStockCandidate {
  @Field(() => String)
  storeId!: string;

  @Field(() => String)
  productVariantId!: string;

  @Field(() => Int, { nullable: true })
  quantity?: number | null;

  @Field(() => Int, { nullable: true })
  reorderPoint?: number | null;

  @Field(() => Int, { nullable: true })
  reorderQty?: number | null;

  // Enriched details
  @Field(() => String, { nullable: true })
  storeName?: string | null;

  @Field(() => String, { nullable: true })
  productId?: string | null;

  @Field(() => String, { nullable: true })
  productName?: string | null;

  @Field(() => String, { nullable: true })
  barcode?: string | null;

  // Supplier catalog hints (best/primary supplier)
  @Field(() => String, { nullable: true })
  supplierId?: string | null;

  @Field(() => String, { nullable: true })
  supplierName?: string | null;

  @Field(() => Float, { nullable: true })
  supplierDefaultCost?: number | null;

  @Field(() => Int, { nullable: true })
  supplierLeadTimeDays?: number | null;

  @Field(() => Boolean, { nullable: true })
  supplierIsPreferred?: boolean | null;

  @Field(() => Int, { nullable: true })
  supplierCount?: number | null;
}
