import { FulfillmentStatus } from '@prisma/client';

type TransitionMap = Record<FulfillmentStatus, readonly FulfillmentStatus[]>;

const TRANSITIONS: TransitionMap = {
  [FulfillmentStatus.PENDING]: [
    FulfillmentStatus.ASSIGNED,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.ASSIGNED]: [
    FulfillmentStatus.IN_TRANSIT,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.IN_TRANSIT]: [
    FulfillmentStatus.DELIVERED,
    FulfillmentStatus.CANCELLED,
  ],
  [FulfillmentStatus.DELIVERED]: [],
  [FulfillmentStatus.CANCELLED]: [],
};

export function allowedFulfillmentTransitions(
  from: FulfillmentStatus,
): readonly FulfillmentStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return allowedFulfillmentTransitions(from).includes(to);
}

export function ensureFulfillmentTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
) {
  if (!canTransitionFulfillment(from, to)) {
    throw new Error(`Invalid fulfillment transition: ${from} → ${to}`);
  }
}
