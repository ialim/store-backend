import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class VariantSalesWithDetails {
  @Field()
  productVariantId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field({ nullable: true })
  productId?: string | null;

  @Field({ nullable: true })
  productName?: string | null;

  @Field({ nullable: true })
  size?: string | null;

  @Field({ nullable: true })
  concentration?: string | null;

  @Field({ nullable: true })
  packaging?: string | null;

  @Field({ nullable: true })
  barcode?: string | null;
}

