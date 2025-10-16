import { Field, InputType, Int, ID } from '@nestjs/graphql';

@InputType()
export class RegisterFulfillmentInterestInput {
  @Field(() => ID)
  fulfillmentId!: string;

  @Field(() => Int, { nullable: true, description: 'Estimated arrival time in minutes' })
  etaMinutes?: number | null;

  @Field({ nullable: true })
  message?: string | null;
}
