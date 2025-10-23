# Design System Rollout Plan

## Goals
- Maintain a single source of truth for branding (colors, typography, spacing, elevation).
- Reuse UI primitives across the admin web client and stakeholder mobile app.
- Reduce rework when adjusting visual language or accessibility affordances.

## Building Blocks
- `@store/design-tokens`: exposes raw tokens (palette, radii, typography, spacing, shadows). Currently consumed by the admin theme and `@store/ui`.
- `@store/ui`: React Native-first implementation of shared primitives (`Screen`, `NavBar`, `ListItem`, `TextField`, `Button`, `Tag`, etc.). Web adapters (`@store/ui-web`) wrap MUI components with the same API surface.

## Web Migration Outline
1. **Create MUI adapter layer**: introduce a `/packages/ui-web` (or similar) package that maps `@store/ui` component contracts to MUI implementations, reusing tokens for styling overrides.
2. **Incremental adoption**: start with authentication surfaces (login/reset) then move through dashboard cards, table filters, and form-heavy flows.
3. **Replace ad-hoc styling**: remove duplicated color/radius constants in `admin-ui` and source directly from `@store/design-tokens`.
4. **Regression SLAs**: for each migrated screen, run a visual regression pass (Chromatic or Playwright snapshots) to ensure parity with the previous MUI styling.
5. **Documentation & guidelines**: update onboarding docs so new UI work begins in `@store/ui` (implement native first, add web adapter).

## Mobile Next Steps
- Extend `@store/ui` with additional primitives (e.g., `Tag`, `ListItem`, `FormSection`) as features demand.
- Build React Navigation theming using tokens to keep header, tab, and drawer styling consistent with admin.
- Backfill automated component tests to lock down spacing and color regressions.
