import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class CreateSupplierPaymentInput {
  @Field(() => ID)
  supplierId: string;

  @Field(() => ID, { nullable: true })
  purchaseOrderId?: string;

  @Field(() => Float)
  amount: number;

  @Field()
  paymentDate: Date;

  @Field()
  method: string;

  @Field({ nullable: true })
  notes?: string;
}
