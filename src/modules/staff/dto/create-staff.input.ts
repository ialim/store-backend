import { InputType, Field } from '@nestjs/graphql';
@InputType()
export class CreateStaffInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  roleId: string;
}
