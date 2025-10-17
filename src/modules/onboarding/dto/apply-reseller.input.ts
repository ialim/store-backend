import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ApplyResellerInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  companyName: string;

  @Field()
  contactPersonName: string;

  @Field()
  contactPhone: string;
}
