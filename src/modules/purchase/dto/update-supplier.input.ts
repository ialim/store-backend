import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class UpdateSupplierInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  contactInfo?: string;

  @Field({ nullable: true })
  isFrequent?: boolean;

  @Field(() => Float, { nullable: true })
  creditLimit?: number;

  @Field({ nullable: true })
  paymentTerms?: string;

  @Field({ nullable: true })
  notes?: string;
}
