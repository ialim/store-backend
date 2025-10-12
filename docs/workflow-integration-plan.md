# Workflow Orchestration Integration Plan

This document captures the migration path for adopting the richer quotation → sale → fulfilment XState setup that ships with the sample project (`nest_js_prisma_xstate_order_flow_quotation_→_sale_→_fulfilment-2.ts`) inside our production codebase.

## 1. Data Model & Persistence

1. Persist workflow metadata  
   - Add `workflowState` and `workflowContext` columns to `SaleOrder` and `Fulfillment` so we can store the active XState node and any contextual flags.
   - Introduce a lightweight transition log table to capture every macro transition (state, actor, timestamp, trigger event).

2. Support override & credit flows  
   - Create `OverrideRequest` records to track admin/credit decisions referenced by the sale machine.
   - Mirror the sample’s `CustomerCreditProfile`/`CustomerSalesAgg` snapshotting if we need credit-based guards on consumer sales (re-use existing reseller credit tables where possible).

## 2. Machines & Backend Services

1. XState alignment  
   - Port the blueprint’s sale machine (admin & credit overrides, accumulated captures, outbox hooks) into `src/state/sale.machine.ts`, adapting guards/actions to our Prisma models.
   - Extend the fulfilment machine with the additional states (`BACKORDERED`, `RETURN_REQUESTED`, etc.) and make sure actions reconcile inventory and emit domain events.
   - Optionally layer in the quotation machine if we decide the extra guard rails help us (current enum checks may be sufficient for now).

2. Phase coordination  
   - Expand `PhaseCoordinator` to create/update sale/fulfilment records when machines exit (`onQuotationApproved`, `onSaleCleared`) and append transition logs.
   - Update `SalesService`/`OrderService` to use the machines for transitions, implement credit checks, and expose override helpers.

## 3. API & UI Surface

1. GraphQL API  
   - Add mutations/queries for override approval, credit snapshots, and workflow inspection.  
   - Publish workflow state/context fields on `SaleOrder`/`Fulfillment` objects.

2. Admin UI  
   - Consume the new fields in order/fulfilment screens; expose override flows only to users with the right roles/permissions.  
   - Replace ad-hoc state chips with the machine-derived state where applicable.

## 4. Rollout & Testing

1. Migration path  
   - Backfill workflow state/context for existing records (e.g., set `AWAITING_PAYMENT_METHOD` for pending orders).  
   - Seed transition logs for recent activity, if needed, to keep the audit trail consistent.

2. Validation  
   - Author end-to-end tests that drive the machines through quotation approval → payment → fulfilment → completion.  
   - Monitor domain events and logs after rollout to ensure downstream systems pick up the new signals.

## 5. Incremental Delivery

Tackle the migration in thin vertical slices:

1. Schema migrations + transition logging  
2. Sale machine parity + backend hooks  
3. Fulfilment machine parity + coordinator updates  
4. API & UI enhancements for overrides and credit checks  
5. Final polish, tests, and rollout playbook

Each slice should be deployable independently so we can gate the new behaviour behind feature flags if needed.
