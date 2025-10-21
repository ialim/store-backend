# Mobile Stakeholder Experience Plan

## Objectives
- Deliver a role-aware mobile experience that serves resellers, riders, billers, and managers without fragmenting engineering effort.
- Reuse existing NestJS + GraphQL backend capabilities (roles, permissions, workflows) to minimise API churn.
- Enable faster iteration loops through shared component libraries, over-the-air updates, and unified analytics.

## Guiding Principles
- **Single codebase, role-aware UI:** Ship one React Native/Expo application with navigation gated by permissions coming from existing guards (`permissions.guard.ts`, `roles.guard.ts`).
- **Shared domain logic:** Co-locate TypeScript models, GraphQL fragments, and validation logic with the current `admin-ui` to keep business rules consistent.
- **Progressive enhancement:** Start with high-impact mobile personas (likely Rider, Reseller) and layer on additional stakeholder flows as telemetry and feedback accumulate.
- **Operational simplicity:** Prefer OTA release channels (Expo EAS Update or CodePush) for fast fixes; keep app-store submissions for milestone drops.

## Current State Snapshot
- Backend already exposes modular resolvers/services for orders, fulfilment, payments, returns, and events.
- Role and permission data are centralised in `shared/permissions.ts` with enforcement through Nest guards (`roles.guard.ts`, `permissions.guard.ts`).
- Admin web client (React) contains reusable GraphQL operations and UI patterns that can inform component extraction for mobile.

## Target Architecture
- **Mobile shell:** React Native (Expo-managed workflow to reduce build complexity) with React Navigation; authentication tokens fetched from existing NestJS endpoints.
- **Capability discovery:** Upon login, client receives role + permission claims; the app builds navigation stacks and feature flags from this matrix.
- **Shared packages:** Introduce a monorepo package (e.g. `packages/mobile-shared`) housing domain types, API hooks, validation schemas, and design tokens shared between admin web and mobile.
- **Feature modules:** Each stakeholder resides in its own folder (e.g. `mobile/src/features/rider`) with isolated navigation, screens, and services that depend on common primitives.
- **Telemetry:** Centralise logging and analytics (e.g. Segment or self-hosted) to compare desktop vs mobile funnels and inform iteration.

## Phased Roadmap
### Phase 0 — Discovery (1-2 sprints)
- Map stakeholder jobs-to-be-done from existing modules/workflow docs; confirm with product and ops teams.
- Audit GraphQL endpoints for mobile suitability (payload size, pagination, filtering, offline tolerance).
- Define capability matrix aligning business permissions with UX routes; update `shared/permissions.ts` if new claims are required.

### Phase 1 — Foundation (2 sprints)
- Scaffold Expo project inside repository (e.g. `apps/mobile`) with TypeScript, eslint/prettier matching admin standards.
- Implement authentication flow reusing current NestJS JWT/session semantics; ensure refresh/token rotation is mobile-friendly.
- Set up shared packages for types and GraphQL fragments (consider Nx or Turborepo to streamline builds).
- Build navigation shell: splash, login, role resolver, and placeholder dashboards keyed off capability matrix.

### Phase 2 — Role Modules (3-4 sprints, iterative)
- Prioritise Rider and Reseller features (order assignments, delivery confirmation, sales capture) using thin vertical slices.
- Extract reusable primitives (buttons, form controls, list patterns) into a mobile design system.
- Implement feature gating/feature flags to enable partial releases per stakeholder.
- Introduce offline-first patterns where operationally necessary (e.g. caching pending deliveries).

### Phase 3 — Quality & Operations (parallel to Phase 2)
- Add automated testing: unit tests (Jest), component tests (React Native Testing Library), critical-path e2e (Detox).
- Integrate CI/CD pipeline (GitHub Actions + Expo EAS or Fastlane) for builds, tests, and OTA release channels.
- Document support playbooks, incident response, and monitoring for mobile-specific telemetry.

### Phase 4 — Rollout & Expansion
- Run pilot with a single stakeholder cohort; gather feedback on UX, performance, and reliability.
- Iterate and expand to additional personas (Biller, Manager) once core flows stabilize.
- Evaluate manager needs for responsive web vs native; consider embedding selected admin views if native parity is low ROI.

## Dependencies & Decisions
- Choose cross-platform stack (Expo vs bare RN) and confirm required native modules for features like geolocation or push notifications.
- Validate that existing auth endpoints can expose rich permission payloads in a mobile-friendly shape; plan adjustments if not.
- Align product, design, and engineering on feature flag taxonomy and naming to avoid divergence between web and mobile.
- Confirm analytics/logging tooling supports mobile ingestion without major backend work.

## Risks & Mitigations
- **Fragmented UX requirements:** Mitigate with capability matrix reviews and shared design tokens to keep stakeholders aligned.
- **Backend gaps (e.g. pagination, latency):** Surface during Phase 0 audit; schedule backend tasks before mobile timelines depend on them.
- **Operational overhead:** Use shared CI templates and OTA to reduce deployment friction; automate release notes and stakeholder communication.
- **Scope creep:** Enforce vertical slice delivery and definition of done per feature module; maintain product backlog discipline.

## Next Actions
1. Schedule discovery workshop with product/ops to validate stakeholder goals and permission mappings.
2. Document API audit outcomes (payload gaps, new endpoints) and create backend work items as needed.
3. Spin up the Expo project skeleton and shared package scaffolding to unlock parallel development.
