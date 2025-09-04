import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class AssignStoreManagerInput {
  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  storeId: string;
}
