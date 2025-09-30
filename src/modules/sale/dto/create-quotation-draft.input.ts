import { InputType, Field, ID } from '@nestjs/graphql';
import { SaleType } from '../../../shared/prismagraphql/prisma/sale-type.enum';
import { SaleChannel } from '../../../shared/prismagraphql/prisma/sale-channel.enum';

@InputType()
export class CreateQuotationDraftItemInput {
  @Field(() => ID)
  productVariantId: string;

  @Field()
  quantity: number;

  @Field()
  unitPrice: number;
}

@InputType()
export class CreateQuotationDraftInput {
  @Field(() => SaleType)
  type: SaleType;

  @Field(() => SaleChannel)
  channel: SaleChannel;

  @Field(() => ID)
  storeId: string;

  @Field(() => ID, { nullable: true })
  consumerId?: string;

  @Field(() => ID, { nullable: true })
  resellerId?: string;

  @Field(() => ID, { nullable: true })
  billerId?: string;

  @Field(() => [CreateQuotationDraftItemInput])
  items: CreateQuotationDraftItemInput[];
}
