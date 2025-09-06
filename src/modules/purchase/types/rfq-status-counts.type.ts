import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RfqStatusCounts {
  @Field(() => ID, { nullable: true })
  requisitionId?: string | null;

  @Field()
  draft!: number;

  @Field()
  submitted!: number;

  @Field()
  selected!: number;

  @Field()
  rejected!: number;

  @Field()
  total!: number;
}

