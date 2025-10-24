# Mobile App (Expo)

React Native application targeting stakeholder-specific workflows.

## Getting Started
```bash
cd apps/mobile
npm install
npm run start
```

Requires Node `>=20.19.4` for the React Native toolchain (update local runtime if necessary).

Set the backend endpoint by exporting `EXPO_PUBLIC_GRAPHQL_URL` before starting Metro; otherwise the app defaults to `http://localhost:3000/graphql`. The Expo config also exposes the same value via `expo.extra.graphqlUrl`.

## Shared Design System
- Base colors, spacing, typography, and elevation live in `@store/design-tokens`.
- Cross-platform primitives such as `Screen`, `Card`, `TextField`, and `Button` are exposed via `@store/ui` and already power the login screen.
- When adding new screens, compose layouts from `@store/ui` first; if a primitive is missing, extend the package so the web admin can adopt the same contract.

## Next Steps
- Replace the placeholder home screen with stakeholder-specific navigation (e.g. React Navigation stacks).
- Connect domain GraphQL operations (orders, fulfilment, payments) and reuse fragments from `@store/mobile-shared`.
- Add token refresh/expiry handling plus resilient error states for offline or revoked sessions.
- Instrument analytics and crash reporting once flows are in user testing.
