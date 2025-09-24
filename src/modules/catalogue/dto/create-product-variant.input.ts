import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class CreateProductVariantInput {
  @Field(() => ID, { nullable: true })
  productId?: string | null;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  barcode?: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float)
  resellerPrice: number;
}
