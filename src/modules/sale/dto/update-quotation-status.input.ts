import { InputType, Field } from '@nestjs/graphql';
import { QuotationStatus } from '../../../shared/prismagraphql/prisma/quotation-status.enum';

@InputType()
export class UpdateQuotationStatusInput {
  @Field()
  id: string;

  @Field(() => QuotationStatus)
  status: QuotationStatus;
}
