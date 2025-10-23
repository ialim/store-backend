# Store UI

Cross-platform UI primitives that wrap React Native components styled with the shared design tokens. Intended for reuse across the stakeholder mobile app and future web adapters.

## Components
- `Screen` – base layout with brand background/padding.
- `Card` – elevated container with consistent radius/shadow.
- `TextField` – labeled text input with helper/error state.
- `Button` – primary/secondary/ghost variants with loading state.

## Usage
```tsx
import { Screen, Card, TextField, Button } from '@store/ui';

function LoginScreen() {
  return (
    <Screen>
      <Card>
        <TextField label="Email" autoCapitalize="none" />
        <Button label="Continue" onPress={handleSubmit} />
      </Card>
    </Screen>
  );
}
```

Build the package with `npm --prefix packages/ui run build`.
