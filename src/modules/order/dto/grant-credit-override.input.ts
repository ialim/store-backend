import { Field, Float, InputType } from '@nestjs/graphql';

@InputType()
export class GrantCreditOverrideInput {
  @Field()
  saleOrderId!: string;

  @Field(() => Float)
  approvedAmount!: number;

  @Field(() => String, { nullable: true })
  expiresAt?: string | null;
}
