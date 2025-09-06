import { InputType, Field, Float } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@InputType()
export class UpsertVariantTierPriceInput {
  @Field()
  productVariantId: string;

  @Field(() => UserTier)
  tier: keyof typeof UserTier;

  @Field(() => Float)
  price: number;
}
