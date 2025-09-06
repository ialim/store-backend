import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class SupplierPaymentMethodBreakdownEntry {
  @Field(() => String)
  method!: string;

  @Field(() => Float)
  totalPaid!: number;

  @Field(() => Int)
  count!: number;
}
