# Store UI

Cross-platform UI primitives that wrap React Native components styled with the shared design tokens. Intended for reuse across the stakeholder mobile app and future web adapters.

## Components
- `Screen` – base layout with brand background/padding.
- `NavBar` – lightweight top navigation bar with slots for actions.
- `Card` – elevated container with consistent radius/shadow.
- `ListItem` – pressable row with optional leading/trailing slots.
- `TextField` – labeled text input with helper/error state.
- `Button` – primary/secondary/ghost variants with loading state.
- `Tag` – pill-shaped status badge with solid/subtle variants.

## Usage
```tsx
import { Screen, NavBar, Card, ListItem, TextField, Button, Tag } from '@store/ui';

function LoginScreen() {
  return (
    <Screen>
      <NavBar title="Sign in" />
      <Card>
        <TextField label="Email" autoCapitalize="none" />
        <Button label="Continue" onPress={handleSubmit} />
      </Card>
      <ListItem title="Need help?" description="Contact support from the app menu" trailing={<Tag label="Beta" />} />
    </Screen>
  );
}
```

Build the package with `npm --prefix packages/ui run build`.
