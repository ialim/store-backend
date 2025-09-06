import { ObjectType, Field, Float } from '@nestjs/graphql';
import { UserTier } from '../../../shared/prismagraphql/prisma/user-tier.enum';

@ObjectType()
export class VariantTierPrice {
  @Field()
  productVariantId!: string;

  @Field(() => UserTier)
  tier!: keyof typeof UserTier;

  @Field(() => Float)
  price!: number;
}

