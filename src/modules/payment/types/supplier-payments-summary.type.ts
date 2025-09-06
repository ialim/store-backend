import { ObjectType, Field, Float, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class SupplierPaymentsSummary {
  @Field()
  supplierId!: string;

  @Field({ nullable: true })
  month?: string;

  @Field(() => Float)
  totalPaid!: number;

  @Field(() => Float)
  count!: number;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastPaymentDate?: Date | null;
}
