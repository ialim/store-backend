import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { SaleType } from '../../../shared/prismagraphql/prisma/sale-type.enum';
import { SaleChannel } from '../../../shared/prismagraphql/prisma/sale-channel.enum';

@InputType()
export class UpdateQuotationItemInput {
  @Field(() => ID)
  productVariantId!: string;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;
}

@InputType()
export class UpdateQuotationInput {
  @Field(() => ID)
  id!: string;

  @Field(() => SaleType, { nullable: true })
  type?: SaleType;

  @Field(() => SaleChannel, { nullable: true })
  channel?: SaleChannel;

  @Field(() => ID, { nullable: true })
  storeId?: string;

  @Field(() => ID, { nullable: true })
  consumerId?: string | null;

  @Field(() => ID, { nullable: true })
  resellerId?: string | null;

  @Field(() => ID, { nullable: true })
  billerId?: string | null;

  @Field(() => [UpdateQuotationItemInput], { nullable: true })
  items?: UpdateQuotationItemInput[] | null;
}
