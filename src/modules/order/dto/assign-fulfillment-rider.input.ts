import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AssignFulfillmentRiderInput {
  @Field(() => ID)
  fulfillmentId!: string;

  @Field(() => ID)
  riderId!: string;
}
