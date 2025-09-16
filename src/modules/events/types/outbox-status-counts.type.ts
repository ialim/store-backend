import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class OutboxStatusCounts {
  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  failed!: number;

  @Field(() => Int)
  published!: number;
}
