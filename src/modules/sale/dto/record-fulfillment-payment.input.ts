import { Field, Float, InputType } from '@nestjs/graphql';

@InputType()
export class RecordFulfillmentPaymentInput {
  @Field(() => String)
  fulfillmentId!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => String, { nullable: true })
  method?: string | null;

  @Field(() => String, { nullable: true })
  reference?: string | null;

  @Field(() => Date, { nullable: true })
  receivedAt?: Date | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;
}
