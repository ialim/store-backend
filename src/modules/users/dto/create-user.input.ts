import { InputType, Field } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@InputType()
export class CreateUserInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => UserTier, { nullable: true })
  tier?: UserTier;

  @Field({ nullable: true })
  referralCode?: string;
}
