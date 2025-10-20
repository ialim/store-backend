import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateResellerBrandingInput {
  @Field(() => String, { nullable: true })
  companyInitials?: string | null;

  @Field(() => String, { nullable: true })
  companyLogoUrl?: string | null;

  @Field(() => String, { nullable: true })
  companyName?: string | null;

  @Field(() => String, { nullable: true })
  contactPersonName?: string | null;

  @Field(() => String, { nullable: true })
  contactPhone?: string | null;
}
