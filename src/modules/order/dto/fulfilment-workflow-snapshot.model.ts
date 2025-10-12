import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { FulfillmentTransitionLog } from '../../../shared/prismagraphql/fulfillment-transition-log/fulfillment-transition-log.model';

@ObjectType()
export class FulfilmentWorkflowSnapshot {
  @Field()
  saleOrderId!: string;

  @Field()
  fulfillmentId!: string;

  @Field()
  state!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: any;

  @Field(() => [FulfillmentTransitionLog])
  transitionLogs!: FulfillmentTransitionLog[];
}
