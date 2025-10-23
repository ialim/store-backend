# Store UI Web

React DOM + MUI implementation of the shared `@store/ui` primitives. Reuses `@store/design-tokens` for styling so web screens stay in sync with mobile.

## Components
- `Screen` – base layout container with canvas background.
- `NavBar` – top bar with slots for actions and optional subtitle.
- `Card` – elevated surface with brand radius/shadow.
- `ListItem` – pressable row with leading/trailing content.
- `TextField` – MUI text field styled with shared tokens.
- `Button` – primary/secondary/ghost variants with loading state.
- `Tag` – badge component with solid/subtle tones.

## Usage
```tsx
import { Screen, NavBar, Card, ListItem, TextField, Button, Tag } from '@store/ui-web';

function Login() {
  return (
    <Screen padded sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <NavBar title="Sign in" />
      <Card sx={{ width: 380, display: 'grid', gap: 24 }}>
        <TextField label="Email" fullWidth />
        <Button label="Continue" fullWidth onClick={() => {}} />
      </Card>
      <ListItem
        title="Need help?"
        description="Contact support if you cannot access your account."
        trailing={<Tag label="Support" variant="info" tone="subtle" />}
        sx={{ maxWidth: 380 }}
      />
    </Screen>
  );
}
```
