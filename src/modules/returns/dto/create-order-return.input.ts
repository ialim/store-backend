import { InputType, Field } from '@nestjs/graphql';
import { ReturnLocation } from '../../../shared/prismagraphql/prisma/return-location.enum';
import { CreateSalesReturnItemInput } from './create-sales-return.input';

@InputType()
export class CreateOrderReturnInput {
  @Field()
  orderId!: string;

  @Field(() => String, { nullable: true })
  returnedById?: string | null;

  @Field(() => String, { nullable: true })
  receivedById?: string | null;

  @Field(() => ReturnLocation)
  returnLocation!: ReturnLocation;

  @Field(() => [CreateSalesReturnItemInput])
  items!: CreateSalesReturnItemInput[];
}
