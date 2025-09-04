import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProductCategoryInput {
  @Field()
  name: string;
}
