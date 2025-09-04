import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { PurchaseOrderItemInput } from './purchase-order-item.input';

@InputType()
export class CreatePurchaseOrderInput {
  @Field(() => ID)
  supplierId: string;

  @Field()
  invoiceNumber: string;

  @Field()
  dueDate: Date;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => [PurchaseOrderItemInput])
  items: PurchaseOrderItemInput[];
}
