import { InputType, Field } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@InputType()
export class ApproveResellerInput {
  @Field(() => UserTier)
  tier: UserTier;

  @Field()
  creditLimit: number;

  // Assign biller at approval
  @Field({ nullable: true })
  billerId?: string;
}
