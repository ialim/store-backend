import { InputType, Field } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@InputType()
export class ApplyResellerInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  billerId: string;

  @Field(() => UserTier)
  tier: UserTier;

  @Field()
  creditLimit: number;
}
