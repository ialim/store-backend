import { Field, InputType } from '@nestjs/graphql';
import { FulfillmentType } from '../../../shared/prismagraphql/prisma/fulfillment-type.enum';

@InputType()
export class UpdateFulfillmentPreferencesInput {
  @Field()
  saleOrderId!: string;

  @Field(() => FulfillmentType, { nullable: true })
  fulfillmentType?: `${FulfillmentType}` | null;

  @Field(() => String, { nullable: true })
  deliveryAddress?: string | null;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  attemptAutoAdvance?: boolean | null;
}
