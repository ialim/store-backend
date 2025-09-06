import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class SupplierCreditStatus {
  @Field()
  supplierId!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  creditLimit!: number;

  @Field(() => Float)
  currentBalance!: number;
}

