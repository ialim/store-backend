import { InputType, Field } from '@nestjs/graphql';
import { PurchaseOrderStatus } from '../../../shared/prismagraphql/prisma/purchase-order-status.enum';

@InputType()
export class UpdatePurchaseOrderStatusInput {
  @Field()
  id: string;

  @Field(() => PurchaseOrderStatus)
  status: PurchaseOrderStatus;
}
