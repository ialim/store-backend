import { InputType, Field } from '@nestjs/graphql';
import { UpdateCustomerProfileInput } from './update-customer-profile.input';

@InputType()
export class AdminUpdateCustomerProfileInput extends UpdateCustomerProfileInput {
  @Field({ nullable: true })
  profileStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED';
}
