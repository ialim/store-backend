import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CloseRfqInput {
  @Field()
  requisitionId: string;

  @Field({ nullable: true, defaultValue: true })
  rejectDrafts?: boolean;

  @Field({ nullable: true, defaultValue: true })
  rejectUnsubmitted?: boolean;
}

