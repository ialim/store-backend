import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCustomerProfileInput {
  @Field()
  fullName: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  birthday?: Date;

  @Field({ nullable: true })
  preferredStoreId?: string;
}
