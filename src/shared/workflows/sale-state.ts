import { SaleStatus } from '@prisma/client';

type TransitionMap = Record<SaleStatus, readonly SaleStatus[]>;

const TRANSITIONS: TransitionMap = {
  [SaleStatus.PENDING]: [
    SaleStatus.APPROVED,
    SaleStatus.PAID,
    SaleStatus.FULFILLED,
    SaleStatus.CANCELLED,
  ],
  [SaleStatus.APPROVED]: [
    SaleStatus.PAID,
    SaleStatus.FULFILLED,
    SaleStatus.CANCELLED,
    SaleStatus.PENDING,
  ],
  [SaleStatus.PAID]: [
    SaleStatus.FULFILLED,
    SaleStatus.CANCELLED,
    SaleStatus.PENDING,
  ],
  [SaleStatus.FULFILLED]: [],
  [SaleStatus.CANCELLED]: [],
};

export function allowedSaleTransitions(
  from: SaleStatus,
): readonly SaleStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionSale(from: SaleStatus, to: SaleStatus): boolean {
  if (from === to) {
    return true;
  }
  return allowedSaleTransitions(from).includes(to);
}

export function ensureSaleTransition(from: SaleStatus, to: SaleStatus) {
  if (!canTransitionSale(from, to)) {
    throw new Error(`Invalid sale transition: ${from} → ${to}`);
  }
}
