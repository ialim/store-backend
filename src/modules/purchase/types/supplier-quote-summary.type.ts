import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class SupplierQuoteSummary {
  @Field(() => ID)
  id!: string;

  @Field()
  requisitionId!: string;

  @Field()
  supplierId!: string;

  @Field()
  status!: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  validUntil?: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
