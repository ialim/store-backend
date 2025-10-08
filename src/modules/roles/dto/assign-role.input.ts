import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignRoleInput {
  @Field()
  userId: string;

  @Field()
  roleId: string;
}
