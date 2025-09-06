import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RequisitionSummary {
  @Field(() => ID)
  id!: string;

  @Field()
  storeId!: string;

  @Field()
  requestedById!: string;

  @Field()
  status!: string;

  @Field()
  createdAt!: Date;
}

