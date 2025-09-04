import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class AssignBillerInput {
  @Field(() => ID)
  billerId: string;

  @Field(() => ID)
  resellerId: string;
}
