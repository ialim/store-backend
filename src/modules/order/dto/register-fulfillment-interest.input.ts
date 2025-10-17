import { Field, Float, InputType, Int, ID } from '@nestjs/graphql';

@InputType()
export class RegisterFulfillmentInterestInput {
  @Field(() => ID)
  fulfillmentId!: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Estimated arrival time in minutes',
  })
  etaMinutes?: number | null;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Proposed delivery cost from the rider',
  })
  proposedCost?: number | null;
}
