import { FulfillmentStatus } from '@prisma/client';
import { createActor, setup, StateValue } from 'xstate';

export type FulfilState =
  | 'ALLOCATING_STOCK'
  | 'BACKORDERED'
  | 'PICK_PACK'
  | 'READY_FOR_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'SCHEDULING'
  | 'IN_PROGRESS'
  | 'RETURN_REQUESTED'
  | 'RETURN_RECEIVED'
  | 'REFUNDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type FulfilEvent =
  | { type: 'RESERVE_OK' }
  | { type: 'RESERVE_MISS' }
  | { type: 'FULFILMENT_STARTED' }
  | { type: 'PACKAGE_SHIPPED' }
  | { type: 'PACKAGE_DELIVERED' }
  | { type: 'SERVICE_SCHEDULED' }
  | { type: 'SERVICE_COMPLETED' }
  | { type: 'RETURN_REQUESTED' }
  | { type: 'RETURN_RECEIVED' }
  | { type: 'REFUND_ISSUED' }
  | { type: 'CANCEL' }
  | { type: 'FAIL' };

export interface FulfilmentContext {
  saleOrderId?: string;
  metadata?: Record<string, unknown>;
}

const defaultContext: FulfilmentContext = {};

const fulfilmentMachine = setup({
  types: {
    context: {} as FulfilmentContext,
    events: {} as FulfilEvent,
  },
}).createMachine({
  id: 'fulfilment',
  initial: 'ALLOCATING_STOCK',
  context: defaultContext,
  states: {
    ALLOCATING_STOCK: {
      on: {
        RESERVE_OK: 'PICK_PACK',
        RESERVE_MISS: 'BACKORDERED',
        CANCEL: 'CANCELLED',
        FAIL: 'FAILED',
      },
    },
    BACKORDERED: {
      on: {
        RESERVE_OK: 'PICK_PACK',
        CANCEL: 'CANCELLED',
      },
    },
    PICK_PACK: {
      on: {
        FULFILMENT_STARTED: 'READY_FOR_SHIPMENT',
        SERVICE_SCHEDULED: 'SCHEDULING',
        CANCEL: 'CANCELLED',
      },
    },
    READY_FOR_SHIPMENT: {
      on: {
        PACKAGE_SHIPPED: 'SHIPPED',
        CANCEL: 'CANCELLED',
      },
    },
    SHIPPED: {
      on: {
        PACKAGE_DELIVERED: 'DELIVERED',
        RETURN_REQUESTED: 'RETURN_REQUESTED',
        CANCEL: 'CANCELLED',
      },
    },
    DELIVERED: {
      on: {
        RETURN_REQUESTED: 'RETURN_REQUESTED',
        RETURN_RECEIVED: 'RETURN_RECEIVED',
        SERVICE_COMPLETED: 'COMPLETED',
      },
    },
    RETURN_REQUESTED: {
      on: {
        RETURN_RECEIVED: 'RETURN_RECEIVED',
        REFUND_ISSUED: 'REFUNDED',
      },
    },
    RETURN_RECEIVED: {
      on: {
        REFUND_ISSUED: 'REFUNDED',
      },
    },
    REFUNDED: {
      type: 'final',
    },
    SCHEDULING: {
      on: {
        SERVICE_COMPLETED: 'COMPLETED',
        CANCEL: 'CANCELLED',
      },
    },
    IN_PROGRESS: {
      on: {
        SERVICE_COMPLETED: 'COMPLETED',
        RETURN_REQUESTED: 'RETURN_REQUESTED',
      },
    },
    COMPLETED: {
      type: 'final',
    },
    CANCELLED: {
      type: 'final',
    },
    FAILED: {
      type: 'final',
    },
  },
});

const FULFILMENT_STATUS_STATE_MAP: Record<FulfillmentStatus, FulfilState> = {
  [FulfillmentStatus.PENDING]: 'ALLOCATING_STOCK',
  [FulfillmentStatus.ASSIGNED]: 'READY_FOR_SHIPMENT',
  [FulfillmentStatus.IN_TRANSIT]: 'SHIPPED',
  [FulfillmentStatus.DELIVERED]: 'DELIVERED',
  [FulfillmentStatus.CANCELLED]: 'CANCELLED',
};

export function fulfilmentStatusToState(
  status: FulfillmentStatus,
): FulfilState {
  return FULFILMENT_STATUS_STATE_MAP[status] ?? 'ALLOCATING_STOCK';
}

export function runFulfilmentMachine(options: {
  status: FulfillmentStatus;
  events: FulfilEvent[];
  workflowState?: FulfilState | null;
  workflowContext?: Partial<FulfilmentContext> | null;
  contextOverrides?: Partial<FulfilmentContext>;
}): { state: FulfilState; context: FulfilmentContext; changed: boolean } {
  const { status, events, workflowState, workflowContext, contextOverrides } =
    options;
  const context: FulfilmentContext = {
    ...defaultContext,
    ...(workflowContext ?? {}),
    ...(contextOverrides ?? {}),
  };

  const startState =
    (workflowState as StateValue | undefined) ??
    (fulfilmentStatusToState(status) as StateValue);

  const snapshot = fulfilmentMachine.resolveState({
    value: startState,
    context,
  });

  const actor = createActor(fulfilmentMachine, { snapshot });
  actor.start();
  let currentSnapshot = actor.getSnapshot();
  let changed = false;

  for (const event of events) {
    const before = currentSnapshot;
    actor.send(event);
    currentSnapshot = actor.getSnapshot();
    const localChanged =
      before.value !== currentSnapshot.value ||
      before.context !== currentSnapshot.context;
    if (!localChanged) {
      actor.stop();
      return {
        state: currentSnapshot.value as FulfilState,
        context: currentSnapshot.context as FulfilmentContext,
        changed: false,
      };
    }
    changed = true;
  }

  actor.stop();

  return {
    state: currentSnapshot.value as FulfilState,
    context: currentSnapshot.context as FulfilmentContext,
    changed,
  };
}

export function eventsForFulfilmentTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): FulfilEvent[] {
  if (from === to) {
    return [];
  }

  if (to === FulfillmentStatus.CANCELLED) {
    return [{ type: 'CANCEL' }];
  }

  if (from === FulfillmentStatus.PENDING && to === FulfillmentStatus.ASSIGNED) {
    return [{ type: 'RESERVE_OK' }, { type: 'FULFILMENT_STARTED' }];
  }

  if (
    from === FulfillmentStatus.ASSIGNED &&
    to === FulfillmentStatus.IN_TRANSIT
  ) {
    return [{ type: 'PACKAGE_SHIPPED' }];
  }

  if (
    from === FulfillmentStatus.IN_TRANSIT &&
    to === FulfillmentStatus.DELIVERED
  ) {
    return [{ type: 'PACKAGE_DELIVERED' }];
  }

  return [];
}

export function toFulfilmentContextPayload(
  context: FulfilmentContext,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(context ?? {}));
}
