import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class IdInput {
  @Field()
  id: string;
}

@InputType()
export class RejectRequisitionInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  reason?: string;
}

