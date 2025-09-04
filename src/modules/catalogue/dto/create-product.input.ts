import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  barcode?: string;

  @Field(() => ID)
  categoryId: string;
}
