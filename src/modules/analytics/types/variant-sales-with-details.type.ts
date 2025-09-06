import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class VariantSalesWithDetails {
  @Field(() => String)
  productVariantId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String, { nullable: true })
  productId?: string | null;

  @Field(() => String, { nullable: true })
  productName?: string | null;

  @Field(() => String, { nullable: true })
  size?: string | null;

  @Field(() => String, { nullable: true })
  concentration?: string | null;

  @Field(() => String, { nullable: true })
  packaging?: string | null;

  @Field(() => String, { nullable: true })
  barcode?: string | null;
}
