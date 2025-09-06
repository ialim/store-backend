import { ObjectType, Field, ID } from '@nestjs/graphql';

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

  @Field({ nullable: true })
  validUntil?: Date | null;

  @Field()
  createdAt!: Date;
}

