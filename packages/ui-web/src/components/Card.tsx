import type { JSX } from 'react';
import Paper, { PaperProps } from '@mui/material/Paper';
import { colors, radii, shadows, spacing } from '@store/design-tokens';

export type CardProps = PaperProps & {
  padding?: keyof typeof spacing;
};

export function Card({
  padding = 'xl',
  sx,
  ...props
}: CardProps): JSX.Element {
  return (
    <Paper
      elevation={0}
      {...props}
      sx={{
        borderRadius: radii.lg,
        backgroundColor: colors.neutral.white,
        boxShadow: shadows.card,
        padding: spacing[padding] ?? spacing.lg,
        ...sx,
      }}
    />
  );
}
