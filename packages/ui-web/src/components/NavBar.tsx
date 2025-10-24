import type { JSX } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { colors, spacing, fontFamilies, fontSizes, fontWeights } from '@store/design-tokens';

export type NavBarProps = {
  title?: string;
  subtitle?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  showDivider?: boolean;
  sx?: Record<string, unknown>;
};

export function NavBar({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  centerSlot,
  showDivider = false,
  sx,
}: NavBarProps): JSX.Element {
  return (
    <Box
      sx={{
        backgroundColor: colors.neutral.white,
        borderBottom: showDivider ? `1px solid rgba(28, 38, 43, 0.12)` : 'none',
        paddingInline: spacing.lg,
        ...sx,
      }}
    >
      <Box
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <Box minWidth={48} display="flex" alignItems="center" justifyContent="flex-start">
          {leftSlot}
        </Box>
        <Box flex={1} minWidth={0}>
          {centerSlot ?? (
            <Stack spacing={spacing.xs / 2} minWidth={0}>
              {title ? (
                <Typography
                  fontFamily={fontFamilies.sans}
                  fontSize={fontSizes.lg}
                  fontWeight={fontWeights.semibold}
                  color={colors.neutral.textPrimary}
                  noWrap
                >
                  {title}
                </Typography>
              ) : null}
              {subtitle ? (
                <Typography
                  fontFamily={fontFamilies.sans}
                  fontSize={fontSizes.sm}
                  color={colors.neutral.textSecondary}
                  noWrap
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          )}
        </Box>
        <Box minWidth={48} display="flex" alignItems="center" justifyContent="flex-end">
          {rightSlot}
        </Box>
      </Box>
    </Box>
  );
}
