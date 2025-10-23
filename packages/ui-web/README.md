# Store UI Web

React DOM + MUI implementation of the shared `@store/ui` primitives. Reuses `@store/design-tokens` for styling so web screens stay in sync with mobile.

## Components
- `Screen` – base layout container with canvas background.
- `Card` – elevated surface with brand radius/shadow.
- `TextField` – MUI text field styled with shared tokens.
- `Button` – primary/secondary/ghost variants with loading state.

## Usage
```tsx
import { Screen, Card, TextField, Button } from '@store/ui-web';

function Login() {
  return (
    <Screen padded sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card sx={{ width: 380, display: 'grid', gap: 24 }}>
        <TextField label="Email" fullWidth />
        <Button label="Continue" fullWidth onClick={() => {}} />
      </Card>
    </Screen>
  );
}
```
