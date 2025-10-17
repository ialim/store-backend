import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuotationPartyInfo {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String, { nullable: true })
  fullName?: string | null;
}

@ObjectType()
export class QuotationStoreInfo {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;
}

@ObjectType()
export class QuotationViewContext {
  @Field(() => QuotationStoreInfo, { nullable: true })
  store?: QuotationStoreInfo | null;

  @Field(() => QuotationPartyInfo, { nullable: true })
  biller?: QuotationPartyInfo | null;

  @Field(() => QuotationPartyInfo, { nullable: true })
  reseller?: QuotationPartyInfo | null;

  @Field(() => QuotationPartyInfo, { nullable: true })
  consumer?: QuotationPartyInfo | null;
}
