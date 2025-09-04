import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateSupplierInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  contactInfo?: string;

  @Field()
  isFrequent: boolean;

  @Field(() => Float)
  creditLimit: number;

  @Field({ nullable: true })
  paymentTerms?: string;

  @Field({ nullable: true })
  notes?: string;
}
