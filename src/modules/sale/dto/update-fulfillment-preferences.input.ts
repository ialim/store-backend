import { Field, InputType } from '@nestjs/graphql';
import { FulfillmentType } from '../../../shared/prismagraphql/prisma/fulfillment-type.enum';
import { DeliveryAddressInput } from './delivery-address.input';

@InputType()
export class UpdateFulfillmentPreferencesInput {
  @Field()
  saleOrderId!: string;

  @Field(() => FulfillmentType, { nullable: true })
  fulfillmentType?: `${FulfillmentType}` | null;

  @Field(() => String, { nullable: true })
  deliveryAddress?: string | null;

  @Field(() => DeliveryAddressInput, {
    nullable: true,
    description:
      'Structured delivery details (address reference or payload plus receiver contact information).',
  })
  deliveryDetails?: DeliveryAddressInput | null;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  attemptAutoAdvance?: boolean | null;
}
