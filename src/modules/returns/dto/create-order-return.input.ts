import { InputType, Field } from '@nestjs/graphql';
import { ReturnLocation } from '../../../shared/prismagraphql/prisma/return-location.enum';
import { CreateSalesReturnItemInput } from './create-sales-return.input';

@InputType()
export class CreateOrderReturnInput {
  @Field()
  orderId!: string;

  @Field()
  returnedById!: string;

  @Field()
  receivedById!: string;

  @Field(() => ReturnLocation)
  returnLocation!: ReturnLocation;

  @Field(() => [CreateSalesReturnItemInput])
  items!: CreateSalesReturnItemInput[];
}
