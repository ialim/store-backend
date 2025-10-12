import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { SaleOrder } from '../../shared/prismagraphql/sale-order/sale-order.model';
import { SaleStatus, FulfillmentStatus } from '@prisma/client';
import { saleStatusToState } from '../../state/sale.machine';
import { fulfilmentStatusToState } from '../../state/fulfilment.machine';
import { GraphQLJSON } from 'graphql-type-json';
import { SalesService } from '../sale/sale.service';
import { SaleWorkflowSnapshot } from './dto/sale-workflow-snapshot.model';
import { SaleWorkflowSummary } from './dto/sale-workflow-summary.model';
import { FulfilmentWorkflowSnapshot } from './dto/fulfilment-workflow-snapshot.model';

type SaleOrderParent = {
  id: string;
  status: SaleStatus;
  workflowState?: string | null;
  workflowContext?: Record<string, unknown> | null;
  fulfillment?: {
    saleOrderId?: string;
    status: FulfillmentStatus | null;
    workflowState?: string | null;
  } | null;
};

@Resolver(() => SaleOrder)
export class SaleOrderResolver {
  constructor(private readonly sales: SalesService) {}

  @ResolveField(() => String, {
    name: 'saleWorkflowState',
    nullable: true,
    description:
      'Current state of the sale workflow derived from the sale state machine.',
  })
  saleWorkflowState(@Parent() order: SaleOrderParent): string | null {
    if (order?.workflowState) {
      return order.workflowState;
    }
    if (order?.status) {
      return saleStatusToState(order.status);
    }
    return null;
  }

  @ResolveField(() => String, {
    name: 'fulfillmentWorkflowState',
    nullable: true,
    description:
      'Current state of the fulfillment workflow derived from the fulfillment state machine.',
  })
  fulfillmentWorkflowState(@Parent() order: SaleOrderParent): string | null {
    const fulfilmentState = order?.fulfillment?.workflowState;
    if (fulfilmentState) {
      return fulfilmentState;
    }
    const fulfilmentStatus = order?.fulfillment?.status;
    if (fulfilmentStatus) {
      return fulfilmentStatusToState(fulfilmentStatus);
    }
    return null;
  }

  @ResolveField(() => GraphQLJSON, {
    name: 'saleWorkflowContext',
    nullable: true,
    description:
      'Normalized sale workflow context including credit exposure and override flags.',
  })
  async saleWorkflowContext(@Parent() order: SaleOrderParent) {
    if (order?.workflowContext && typeof order.workflowContext === 'object') {
      return order.workflowContext;
    }
    return this.sales.getSaleWorkflowContext(order.id);
  }

  @ResolveField(() => SaleWorkflowSnapshot, {
    name: 'saleWorkflow',
    nullable: true,
    description:
      'Detailed workflow snapshot for this sale order including transition logs.',
  })
  async saleWorkflow(@Parent() order: SaleOrderParent) {
    return this.sales.getSaleWorkflowSnapshot(order.id);
  }

  @ResolveField(() => SaleWorkflowSummary, {
    name: 'saleWorkflowSummary',
    nullable: true,
    description:
      'Payment and credit readiness summary derived from the sale workflow state.',
  })
  async saleWorkflowSummary(@Parent() order: SaleOrderParent) {
    return this.sales.creditCheck(order.id);
  }

  @ResolveField(() => FulfilmentWorkflowSnapshot, {
    name: 'fulfilmentWorkflow',
    nullable: true,
    description:
      'Fulfilment workflow snapshot for the associated fulfillment, if any.',
  })
  async fulfilmentWorkflow(@Parent() order: SaleOrderParent) {
    return this.sales.getFulfilmentWorkflowSnapshot(order.id);
  }
}
