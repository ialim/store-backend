import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { SaleOrderTransitionLog } from '../../../shared/prismagraphql/sale-order-transition-log/sale-order-transition-log.model';

@ObjectType()
export class SaleWorkflowSnapshot {
  @Field()
  saleOrderId!: string;

  @Field()
  state!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  context?: any;

  @Field(() => [SaleOrderTransitionLog])
  transitionLogs!: SaleOrderTransitionLog[];
}
