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

## 6. Follow-up TODOs

- [x] Automate stale-sale expiry: scheduled worker that reverts unpaid sales after a configurable timeout, releases reserved stock, and notifies stakeholders. (Implemented via `SaleExpiryService`, configurable through `SALE_PENDING_EXPIRY_MINUTES` / `SALE_EXPIRY_CRON`).  
- [x] Provider webhooks: expose endpoints for payment providers to call, translating status updates into `registerConsumerPayment` / `registerResellerPayment` mutations and triggering workflow credit checks automatically (`/payments/webhooks/:provider/...`).  
- [x] Payment receipt attachments: extend the payment module to accept optional receipt uploads (store in S3 + reference path in `ConsumerPayment` / `ResellerPayment`) and expose in UI detail views. (Implemented via `PaymentReceiptController`/`PaymentReceiptService`, schema fields `receiptBucket`/`receiptKey`/`receiptUrl`, and admin UI updates.)  
- [ ] UI polish sweep: revisit order/sales tables after backend changes to ensure human-readable labels, responsive layout, and consistent action button states across roles.

## 7. Rider Assignment Workflow (New)

- [x] Model rider interest via `FulfillmentRiderInterest` records keyed by fulfilment and rider; capture status (`ACTIVE`, `WITHDRAWN`, `ASSIGNED`, `REJECTED`, `EXPIRED`), notes, pricing, and timestamps. (See `prisma/modules/sales.prisma:280` for the schema, unique index, and `expiresAt` support.)
- [x] Extend the fulfilment state machine with an `AWAITING_RIDER_SELECTION` state that opens when a delivery fulfilment is ready to dispatch and transitions to a dedicated `RIDER_ASSIGNED` marker once staff confirm a rider (`src/state/fulfilment.machine.ts:5`). The rider interest service now records the intermediate workflow hop before assignment (`src/modules/order/rider-interest.service.ts:103`).
- [x] Capture rider-proposed delivery cost alongside interest metadata and expose it through the API/UI (`prisma/modules/sales.prisma:294`, `src/modules/order/dto/register-fulfillment-interest.input.ts:12`, `admin-ui/src/pages/Fulfillment.tsx:379`).
- [x] Expose GraphQL queries for riders to list deliverable fulfilments and mutations to register/withdraw interest, guarded by the `RIDER` role (`src/modules/order/rider-interest.resolver.ts:21`, `:43`). Coverage now honours `RiderCoverageArea` rows so riders only see stores they service (fallback to all stores if no coverage is configured) (`prisma/modules/sales.prisma:307`, `src/modules/order/rider-interest.service.ts:120`).
- [x] Provide staff tooling to manage rider coverage areas via GraphQL (`src/modules/order/rider-coverage.resolver.ts:17` / `:28`) and a backing service that upserts/deletes coverage rows transactionally (`src/modules/order/rider-coverage.service.ts:17`). Admin UI wiring exposes the coverage editor in `admin-ui/src/pages/Riders.tsx:1`.
- [x] Provide staff-facing mutations to assign a rider (roles: `SUPERADMIN`, `ADMIN`, `MANAGER`, `BILLER`) and mark competing interests as rejected (`src/modules/order/rider-interest.service.ts:141`). Consider emitting a “selection rejected” reason when we wire up notifications.
- [x] Add notifications/domain events on interest created, withdrawn, assignment, rejection, and auto-expiry so billers/managers are alerted and riders receive feedback. Notification dispatch flows through the outbox via `NotificationService` calls inside `RiderInterestService` and the new expiry job (`src/modules/order/rider-interest.service.ts:210`, `:309`, `:366`; `src/modules/order/rider-interest-expiry.service.ts:85`).
- [x] Build rider/admin UI affordances: riders can volunteer/withdraw on `admin-ui/src/pages/Fulfillment.tsx:320`, while staff can review and assign interests on the same screen. Next, surface location hints and confirmation states in the UI once coverage filtering lands.
- [x] Background task: expire stale interests automatically (cron-driven `RiderInterestExpiryService` with `RIDER_INTEREST_EXPIRY_CRON` / `RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES` defaults) flips overdue `ACTIVE` rows to `EXPIRED` and alerts riders & billers (`src/modules/order/rider-interest-expiry.service.ts:17`).
