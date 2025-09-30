import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class OutboxTypeCount {
  @Field()
  type!: string;

  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  failed!: number;

  @Field(() => Int)
  published!: number;
}
