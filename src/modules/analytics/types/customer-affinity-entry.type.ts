import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class CustomerAffinityEntry {
  @Field()
  productVariantId!: string;

  @Field(() => Int)
  count!: number;
}

