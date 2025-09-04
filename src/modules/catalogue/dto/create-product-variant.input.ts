import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class CreateProductVariantInput {
  @Field(() => ID)
  productId: string;

  @Field()
  size: string;

  @Field()
  concentration: string;

  @Field()
  packaging: string;

  @Field({ nullable: true })
  barcode?: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float)
  resellerPrice: number;
}
