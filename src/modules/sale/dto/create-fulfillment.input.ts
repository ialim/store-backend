import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { DeliveryAddressInput } from './delivery-address.input';

@InputType()
export class CreateFulfillmentInput {
  @Field(() => ID)
  saleOrderId: string;

  @Field(() => String)
  type: 'PICKUP' | 'DELIVERY';

  @Field(() => ID, { nullable: true })
  deliveryPersonnelId?: string;

  @Field({
    nullable: true,
    deprecationReason: 'Use deliveryDetails to supply structured addresses.',
  })
  deliveryAddress?: string;

  @Field(() => DeliveryAddressInput, {
    nullable: true,
    description:
      'Structured delivery details (address reference or payload plus receiver contact information).',
  })
  deliveryDetails?: DeliveryAddressInput | null;

  @Field(() => Float, { nullable: true })
  cost?: number;
}
