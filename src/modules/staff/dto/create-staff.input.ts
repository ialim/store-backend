import { InputType, Field } from '@nestjs/graphql';
import { RoleName } from '../staff.model';
@InputType()
export class CreateStaffInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => RoleName)
  role: RoleName;
}
