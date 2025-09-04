import { InputType, Field, ID } from '@nestjs/graphql';
import { CreateConsumerSaleItemInput } from './create-consumer-sale-item.input';
import { SaleChannel } from 'src/shared/prismagraphql/prisma/sale-channel.enum';

@InputType()
export class CreateConsumerSaleInput {
  @Field(() => ID)
  storeId: string;

  @Field(() => ID)
  customerId: string;

  @Field(() => ID)
  billerId: string;

  @Field(() => SaleChannel)
  channel: SaleChannel;

  @Field(() => [CreateConsumerSaleItemInput])
  items: CreateConsumerSaleItemInput[];
}
