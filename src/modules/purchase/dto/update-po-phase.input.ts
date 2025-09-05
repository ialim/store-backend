import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdatePurchaseOrderPhaseInput {
  @Field()
  id: string;

  @Field()
  phase: string; // Use generated enum after prisma generate
}

@InputType()
export class MarkPurchaseOrderReceivedInput {
  @Field()
  id: string;
}

