# Mobile Shared Package

Shared TypeScript types, validation helpers, and GraphQL fragments for reuse across mobile clients and admin UI.

## Usage
- Import domain models or fragments via the package name `@store/mobile-shared`.
- Ensure the package is built (`npm run build` from `packages/mobile-shared`) before publishing or consuming from other workspaces.
- Current exports include:
  - `STAKEHOLDER_CAPABILITIES` – permission requirements per mobile persona.
  - `getStakeholderPermissions` – helper to derive required/optional permission sets for navigation guards.
