import { InputType, Field } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@InputType()
export class ApplyResellerInput {
  @Field()
  email: string;

  @Field()
  password: string;

  // Optional requested biller during application; actual assignment happens on approval
  @Field({ nullable: true })
  requestedBillerId?: string;

  @Field(() => UserTier)
  tier: UserTier;

  @Field()
  creditLimit: number;
}
