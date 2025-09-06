import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class LinkSupplierUserInput {
  @Field(() => ID)
  supplierId: string;

  @Field(() => ID, { nullable: true })
  userId?: string | null; // null to unlink
}

