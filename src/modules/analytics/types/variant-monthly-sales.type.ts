import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class VariantMonthlySales {
  @Field()
  productVariantId!: string;

  @Field(() => Int)
  quantity!: number;
}
