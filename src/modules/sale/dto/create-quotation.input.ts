import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { CreateQuotationItemInput } from './create-quotation-item.input';
import { QuotationStatus } from '../../../shared/prismagraphql/prisma/quotation-status.enum';

@InputType()
export class CreateQuotationInput {
  @Field(() => ID)
  resellerId: string;

  @Field(() => ID)
  billerId: string;

  @Field(() => [CreateQuotationItemInput])
  items: CreateQuotationItemInput[];

  @Field(() => Float)
  totalAmount: number;

  @Field(() => QuotationStatus)
  status: QuotationStatus;
}
