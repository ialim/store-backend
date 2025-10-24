import type { JSX } from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import { colors, spacing } from '@store/design-tokens';

export type ScreenProps = BoxProps & {
  padded?: boolean;
};

export function Screen({
  padded = true,
  sx,
  ...props
}: ScreenProps): JSX.Element {
  return (
    <Box
      {...props}
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.neutral.canvas,
        padding: padded ? spacing.xl : 0,
        ...sx,
      }}
    />
  );
}
