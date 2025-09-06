import { InputType, Field } from '@nestjs/graphql';
import { ReturnStatus } from '../../../shared/prismagraphql/prisma/return-status.enum';

@InputType()
export class UpdateSalesReturnStatusInput {
  @Field()
  id!: string;

  @Field(() => ReturnStatus)
  status!: ReturnStatus; // ACCEPTED | REJECTED | FULFILLED

  @Field({ nullable: true })
  approvedById?: string; // when needed for auditing
}

