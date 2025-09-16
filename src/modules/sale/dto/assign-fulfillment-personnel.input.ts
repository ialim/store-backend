import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AssignFulfillmentPersonnelInput {
  @Field()
  saleOrderId!: string;

  @Field()
  deliveryPersonnelId!: string;
}
