import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateRoleInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  permissionNames?: string[];
}
