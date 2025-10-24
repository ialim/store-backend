# Store Design Tokens

Centralised color, spacing, typography, and elevation tokens used across the admin web app and stakeholder mobile clients.

## Usage
```ts
import { colors, spacing, fontFamilies } from '@store/design-tokens';

const buttonStyle = {
  backgroundColor: colors.brand.primary,
  paddingHorizontal: spacing.lg,
  fontFamily: fontFamilies.sans,
};
```

Run `npm --prefix packages/design-tokens run build` to emit the compiled ESM bundle consumed by other packages.
