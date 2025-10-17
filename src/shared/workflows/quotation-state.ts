import { QuotationStatus } from '@prisma/client';

type TransitionMap = Record<QuotationStatus, readonly QuotationStatus[]>;

const TRANSITIONS: TransitionMap = {
  [QuotationStatus.DRAFT]: [
    QuotationStatus.SENT,
    QuotationStatus.CONFIRMED,
    QuotationStatus.REJECTED,
  ],
  [QuotationStatus.SENT]: [QuotationStatus.CONFIRMED, QuotationStatus.REJECTED],
  [QuotationStatus.CONFIRMED]: [QuotationStatus.APPROVED],
  [QuotationStatus.APPROVED]: [],
  [QuotationStatus.REJECTED]: [],
};

export function allowedQuotationTransitions(
  from: QuotationStatus,
): readonly QuotationStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionQuotation(
  from: QuotationStatus,
  to: QuotationStatus,
): boolean {
  if (from === to) return true;
  return allowedQuotationTransitions(from).includes(to);
}

export function ensureQuotationTransition(
  from: QuotationStatus,
  to: QuotationStatus,
) {
  if (!canTransitionQuotation(from, to)) {
    throw new Error(`Invalid quotation transition: ${from} → ${to}`);
  }
}
