import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SendSupportMessageInput {
  @Field()
  message!: string;
}

@InputType()
export class AdminSendSupportMessageInput {
  @Field()
  userId!: string;

  @Field()
  message!: string;
}
