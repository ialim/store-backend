import { SaleStatus } from '@prisma/client';
import { assign, createActor, setup, StateValue } from 'xstate';

export type SaleWorkflowState =
  | 'AWAITING_PAYMENT_METHOD'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_PENDING_CONFIRMATION'
  | 'OVERRIDE_REVIEW'
  | 'CLEARED_FOR_FULFILMENT'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

export type SaleEvent =
  | { type: 'SET_PAYMENT_METHOD'; method?: string }
  | { type: 'PAYMENT_METHOD_SUBMITTED'; method?: string }
  | { type: 'PAYMENT_INITIATED' }
  | { type: 'PAYMENT_CONFIRMED'; amount?: number }
  | { type: 'PAYMENT_CAPTURED'; amount?: number }
  | { type: 'PAYMENT_FAILED' }
  | {
      type: 'ADMIN_OVERRIDE_APPROVED';
      expiresAt?: Date | string | null;
    }
  | {
      type: 'CREDIT_OVERRIDE_APPROVED';
      approvedAmount?: number;
      expiresAt?: Date | string | null;
    }
  | { type: 'ADMIN_OVERRIDE_DENIED' }
  | { type: 'CREDIT_OVERRIDE_DENIED' }
  | { type: 'OVERRIDE_REVOKED' }
  | { type: 'RESET' }
  | { type: 'CANCEL' };

export type SaleCallbacks = {
  onSaleCleared?: (context: SaleContext, event: SaleEvent) => void;
};

export interface SaleContext {
  orderId: string;
  grandTotal: number;
  capturedTotal: number;
  credit: {
    limit: number;
    exposure: number;
    overage?: number;
  };
  overrides: {
    admin?: {
      status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
      expiresAt?: string | null;
    };
    credit?: {
      status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
      approvedAmount?: number;
      expiresAt?: string | null;
    };
  };
  clearToFulfil: boolean;
  callbacks?: SaleCallbacks;
}

const defaultContext: SaleContext = {
  orderId: '',
  grandTotal: 0,
  capturedTotal: 0,
  credit: {
    limit: 0,
    exposure: 0,
    overage: 0,
  },
  overrides: {},
  clearToFulfil: false,
};

const normalizeDate = (input?: Date | string | null) => {
  if (!input) return null;
  const value = input instanceof Date ? input : new Date(input);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

const markClearToFulfil = assign({
  clearToFulfil: () => true,
}) as any;

const resetFlags = assign({
  overrides: () => ({}),
  clearToFulfil: () => false,
}) as any;

const saveAdminOverride = assign({
  overrides: (context: SaleContext, event: SaleEvent) => {
    if (event.type !== 'ADMIN_OVERRIDE_APPROVED') {
      return context.overrides;
    }
    return {
      ...context.overrides,
      admin: {
        status: 'APPROVED' as const,
        expiresAt: normalizeDate(event.expiresAt),
      },
    };
  },
}) as any;

const saveCreditOverride = assign({
  overrides: (context: SaleContext, event: SaleEvent) => {
    if (event.type !== 'CREDIT_OVERRIDE_APPROVED') {
      return context.overrides;
    }
    return {
      ...context.overrides,
      credit: {
        status: 'APPROVED' as const,
        approvedAmount: event.approvedAmount ?? context.credit.overage ?? 0,
        expiresAt: normalizeDate(event.expiresAt),
      },
    };
  },
}) as any;

const emitSaleClearedAction = ({
  context,
  event,
}: {
  context: SaleContext;
  event: SaleEvent;
}) => {
  if (context.callbacks?.onSaleCleared) {
    context.callbacks.onSaleCleared(context, event);
  }
};

const isAdminOverrideValid = (context: SaleContext) => {
  const override = context.overrides.admin;
  if (!override || override.status !== 'APPROVED') {
    return false;
  }
  if (!override.expiresAt) {
    return true;
  }
  return new Date(override.expiresAt).getTime() > Date.now();
};

const isCreditOverrideValid = (context: SaleContext) => {
  const override = context.overrides.credit;
  if (!override || override.status !== 'APPROVED') {
    return false;
  }
  if (!override.expiresAt) {
    return true;
  }
  const validWindow = new Date(override.expiresAt).getTime() > Date.now();
  const coversOverage =
    (override.approvedAmount ?? 0) >= (context.credit.overage ?? 0);
  return validWindow && coversOverage;
};

const isOverrideSatisfiedContext = (context: SaleContext) =>
  isAdminOverrideValid(context) || isCreditOverrideValid(context);

const saleMachine = setup({
  types: {
    context: {} as SaleContext,
    events: {} as SaleEvent,
  },
  actions: {
    markClearToFulfil,
    resetFlags,
    saveAdminOverride,
    saveCreditOverride,
    emitSaleCleared: emitSaleClearedAction as any,
  },
  guards: {
    isPaymentSatisfied: ({ context }: { context: SaleContext }) =>
      context.clearToFulfil ||
      context.capturedTotal >= context.grandTotal ||
      isOverrideSatisfiedContext(context),
    isOverrideSatisfied: ({ context }: { context: SaleContext }) =>
      isOverrideSatisfiedContext(context),
  },
}).createMachine({
  id: 'saleLifecycle',
  initial: 'AWAITING_PAYMENT_METHOD',
  context: defaultContext,
  states: {
    AWAITING_PAYMENT_METHOD: {
      on: {
        SET_PAYMENT_METHOD: 'PAYMENT_INITIATED',
        PAYMENT_METHOD_SUBMITTED: 'PAYMENT_INITIATED',
        ADMIN_OVERRIDE_APPROVED: {
          target: 'CLEARED_FOR_FULFILMENT',
          actions: [
            'saveAdminOverride',
            'markClearToFulfil',
            'emitSaleCleared',
          ],
        },
        CREDIT_OVERRIDE_APPROVED: {
          target: 'CLEARED_FOR_FULFILMENT',
          actions: [
            'saveCreditOverride',
            'markClearToFulfil',
            'emitSaleCleared',
          ],
        },
        CANCEL: 'CANCELLED',
      },
    },
    PAYMENT_INITIATED: {
      on: {
        PAYMENT_CONFIRMED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
          { target: 'PAYMENT_PENDING_CONFIRMATION' },
        ],
        PAYMENT_CAPTURED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
          { target: 'PAYMENT_PENDING_CONFIRMATION' },
        ],
        PAYMENT_FAILED: 'PAYMENT_FAILED',
        ADMIN_OVERRIDE_APPROVED: {
          target: 'OVERRIDE_REVIEW',
          actions: ['saveAdminOverride'],
        },
        CREDIT_OVERRIDE_APPROVED: {
          target: 'OVERRIDE_REVIEW',
          actions: ['saveCreditOverride'],
        },
        CANCEL: 'CANCELLED',
      },
    },
    PAYMENT_PENDING_CONFIRMATION: {
      on: {
        PAYMENT_CONFIRMED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
        ],
        PAYMENT_CAPTURED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
        ],
        PAYMENT_FAILED: 'PAYMENT_FAILED',
        ADMIN_OVERRIDE_APPROVED: {
          target: 'OVERRIDE_REVIEW',
          actions: ['saveAdminOverride'],
        },
        CREDIT_OVERRIDE_APPROVED: {
          target: 'OVERRIDE_REVIEW',
          actions: ['saveCreditOverride'],
        },
        CANCEL: 'CANCELLED',
      },
    },
    OVERRIDE_REVIEW: {
      on: {
        ADMIN_OVERRIDE_APPROVED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isOverrideSatisfied',
            actions: [
              'saveAdminOverride',
              'markClearToFulfil',
              'emitSaleCleared',
            ],
          },
          { actions: ['saveAdminOverride'] },
        ],
        CREDIT_OVERRIDE_APPROVED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isOverrideSatisfied',
            actions: [
              'saveCreditOverride',
              'markClearToFulfil',
              'emitSaleCleared',
            ],
          },
          { actions: ['saveCreditOverride'] },
        ],
        ADMIN_OVERRIDE_DENIED: 'PAYMENT_PENDING_CONFIRMATION',
        CREDIT_OVERRIDE_DENIED: 'PAYMENT_PENDING_CONFIRMATION',
        OVERRIDE_REVOKED: 'PAYMENT_PENDING_CONFIRMATION',
        PAYMENT_CONFIRMED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
        ],
        PAYMENT_CAPTURED: [
          {
            target: 'CLEARED_FOR_FULFILMENT',
            cond: 'isPaymentSatisfied',
            actions: ['markClearToFulfil', 'emitSaleCleared'],
          },
        ],
        PAYMENT_FAILED: 'PAYMENT_FAILED',
        CANCEL: 'CANCELLED',
      },
    },
    PAYMENT_FAILED: {
      on: {
        RESET: {
          target: 'AWAITING_PAYMENT_METHOD',
          actions: ['resetFlags'],
        },
        SET_PAYMENT_METHOD: 'PAYMENT_INITIATED',
        PAYMENT_METHOD_SUBMITTED: 'PAYMENT_INITIATED',
        CANCEL: 'CANCELLED',
      },
    },
    CLEARED_FOR_FULFILMENT: {
      type: 'final',
      entry: ['emitSaleCleared'],
      on: {
        RESET: {
          target: 'AWAITING_PAYMENT_METHOD',
          actions: ['resetFlags'],
        },
      },
    },
    CANCELLED: {
      type: 'final',
    },
  },
});

const SALE_STATUS_STATE_MAP: Record<SaleStatus, SaleWorkflowState> = {
  [SaleStatus.PENDING]: 'AWAITING_PAYMENT_METHOD',
  [SaleStatus.APPROVED]: 'PAYMENT_PENDING_CONFIRMATION',
  [SaleStatus.PAID]: 'CLEARED_FOR_FULFILMENT',
  [SaleStatus.FULFILLED]: 'CLEARED_FOR_FULFILMENT',
  [SaleStatus.CANCELLED]: 'CANCELLED',
};

export function saleStatusToState(status: SaleStatus): SaleWorkflowState {
  return SALE_STATUS_STATE_MAP[status] ?? 'AWAITING_PAYMENT_METHOD';
}

export function runSaleMachine(options: {
  status: SaleStatus;
  event: SaleEvent;
  workflowState?: SaleWorkflowState | null;
  workflowContext?: Partial<SaleContext> | null;
  contextOverrides?: Partial<SaleContext>;
  callbacks?: SaleCallbacks;
}): {
  state: SaleWorkflowState;
  context: SaleContext;
  changed: boolean;
} {
  const {
    status,
    event,
    workflowState,
    workflowContext,
    contextOverrides,
    callbacks,
  } = options;

  const context: SaleContext = {
    ...defaultContext,
    ...(workflowContext ?? {}),
    ...(contextOverrides ?? {}),
    callbacks,
  };

  const startState =
    (workflowState as StateValue | undefined) ??
    (saleStatusToState(status) as StateValue);

  const snapshot = saleMachine.resolveState({
    value: startState,
    context,
  });
  const actor = createActor(saleMachine, { snapshot });
  actor.start();
  const before = actor.getSnapshot();
  actor.send(event);
  const next = actor.getSnapshot();
  actor.stop();

  const changed =
    before.value !== next.value || before.context !== next.context;

  return {
    state: next.value as SaleWorkflowState,
    context: next.context as SaleContext,
    changed,
  };
}

export function toSaleContextPayload(
  context: SaleContext,
): Record<string, unknown> {
  const { callbacks, ...rest } = context;
  return JSON.parse(JSON.stringify(rest));
}
