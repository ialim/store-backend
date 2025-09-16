import { InputType, Field } from '@nestjs/graphql';
import { FulfillmentStatus } from '../../../shared/prismagraphql/prisma/fulfillment-status.enum';

@InputType()
export class UpdateFulfillmentStatusInput {
  @Field()
  saleOrderId!: string;

  @Field(() => FulfillmentStatus)
  status!: FulfillmentStatus;

  @Field({ nullable: true })
  confirmationPin?: string;
}
