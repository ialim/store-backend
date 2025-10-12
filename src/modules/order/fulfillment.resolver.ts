import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Fulfillment } from '../../shared/prismagraphql/fulfillment/fulfillment.model';
import { SalesService } from '../sale/sale.service';
import { FulfilmentWorkflowSnapshot } from './dto/fulfilment-workflow-snapshot.model';

type FulfillmentParent = {
  id: string;
  saleOrderId: string;
  workflowContext?: Record<string, unknown> | null;
};

@Resolver(() => Fulfillment)
export class FulfillmentResolver {
  constructor(private readonly sales: SalesService) {}

  @ResolveField(() => GraphQLJSON, {
    name: 'fulfillmentWorkflowContext',
    nullable: true,
    description:
      'Normalized fulfillment workflow context including scheduling metadata.',
  })
  async fulfillmentWorkflowContext(@Parent() fulfillment: FulfillmentParent) {
    if (
      fulfillment?.workflowContext &&
      typeof fulfillment.workflowContext === 'object'
    ) {
      return fulfillment.workflowContext;
    }
    return this.sales.getFulfilmentWorkflowContext(fulfillment.saleOrderId);
  }

  @ResolveField(() => FulfilmentWorkflowSnapshot, {
    name: 'fulfillmentWorkflow',
    nullable: true,
    description:
      'Fulfillment workflow snapshot with current state and transition logs.',
  })
  async fulfillmentWorkflow(@Parent() fulfillment: FulfillmentParent) {
    return this.sales.getFulfilmentWorkflowSnapshot(fulfillment.saleOrderId);
  }
}
