import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class CreateFulfillmentInput {
  @Field(() => ID)
  saleOrderId: string;

  @Field(() => String)
  type: 'PICKUP' | 'DELIVERY';

  @Field(() => ID, { nullable: true })
  deliveryPersonnelId?: string;

  @Field({ nullable: true })
  deliveryAddress?: string;

  @Field(() => Float, { nullable: true })
  cost?: number;
}
