import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GrantAdminOverrideInput {
  @Field()
  saleOrderId!: string;

  @Field(() => String, { nullable: true })
  expiresAt?: string | null;
}
