import { Field, InputType } from '@nestjs/graphql';
import { AddressCreateInput } from '../../../shared/prismagraphql/address/address-create.input';

@InputType()
export class DeliveryAddressInput {
  @Field(() => String, {
    nullable: true,
    description: 'Existing address identifier to reuse.',
  })
  addressId?: string;

  @Field(() => AddressCreateInput, {
    nullable: true,
    description:
      'Address payload to create a new record via the address module when addressId is not provided.',
  })
  address?: AddressCreateInput | null;

  @Field(() => String, {
    nullable: true,
    description: 'Recipient full name displayed to riders.',
  })
  receiverName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Recipient contact number riders can reach out to.',
  })
  receiverPhone?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Additional delivery instructions for the rider or dispatcher.',
  })
  deliveryNotes?: string;
}
