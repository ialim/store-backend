import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SelectSupplierQuoteInput {
  @Field()
  quoteId: string;

  @Field({ nullable: true, defaultValue: true })
  exclusive?: boolean;
}

@InputType()
export class RejectSupplierQuoteInput {
  @Field()
  quoteId: string;

  @Field({ nullable: true })
  reason?: string;
}

