import { InputType, Field, Int } from '@nestjs/graphql';
import { SaleType } from '../../../shared/prismagraphql/prisma/sale-type.enum';
import { ReturnLocation } from '../../../shared/prismagraphql/prisma/return-location.enum';

@InputType()
export class CreateSalesReturnItemInput {
  @Field()
  productVariantId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field()
  condition!: string;
}

@InputType()
export class CreateSalesReturnInput {
  @Field(() => SaleType)
  type!: SaleType;

  @Field({ nullable: true })
  consumerSaleId?: string;

  @Field({ nullable: true })
  resellerSaleId?: string;

  @Field()
  returnedById!: string;

  @Field()
  receivedById!: string;

  @Field(() => ReturnLocation)
  returnLocation!: ReturnLocation;

  @Field(() => [CreateSalesReturnItemInput])
  items!: CreateSalesReturnItemInput[];
}

