import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class LooseProductVariantInput {
  @Field(() => ID, { nullable: true })
  productId?: string | null;

  @Field({ nullable: true })
  name?: string;

  @Field()
  size!: string;

  @Field()
  concentration!: string;

  @Field()
  packaging!: string;

  @Field({ nullable: true })
  barcode?: string;

  @Field(() => Float)
  price!: number;

  @Field(() => Float)
  resellerPrice!: number;
}

@InputType()
export class LinkVariantToProductInput {
  @Field(() => ID)
  variantId!: string;

  @Field(() => ID)
  productId!: string;
}

@InputType()
export class UnlinkVariantFromProductInput {
  @Field(() => ID)
  variantId!: string;
}

