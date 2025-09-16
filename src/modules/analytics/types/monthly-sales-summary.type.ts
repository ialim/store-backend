import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class MonthlySalesSummary {
  @Field()
  month!: string; // YYYY-MM

  @Field(() => Int)
  totalSold!: number;

  @Field(() => Int)
  totalReturned!: number;
}
