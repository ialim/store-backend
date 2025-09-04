import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class FulfillConsumerSaleInput {
  @Field(() => ID)
  id: string;
}

