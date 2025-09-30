import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AdminCreateCustomerInput {
  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field({ nullable: true })
  fullName?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  preferredStoreId?: string;

  @Field({ nullable: true })
  profileStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED';
}
