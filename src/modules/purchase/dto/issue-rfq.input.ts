import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class IssueRfqInput {
  @Field()
  requisitionId: string;

  @Field(() => [String], { nullable: true })
  supplierIds?: string[];
}
