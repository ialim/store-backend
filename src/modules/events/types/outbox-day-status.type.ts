import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class OutboxDayStatus {
  @Field()
  date!: string; // YYYY-MM-DD

  @Field(() => Int)
  pending!: number;

  @Field(() => Int)
  failed!: number;

  @Field(() => Int)
  published!: number;
}
