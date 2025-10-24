import type { JSX } from 'react';
import ButtonBase, { ButtonBaseProps } from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { colors, spacing, radii, fontFamilies, fontSizes, fontWeights, shadows } from '@store/design-tokens';

export type ListItemProps = Omit<ButtonBaseProps, 'children'> & {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  elevated?: boolean;
  titleProps?: Partial<React.ComponentProps<typeof Typography>>;
  descriptionProps?: Partial<React.ComponentProps<typeof Typography>>;
};

export function ListItem({
  title,
  description,
  leading,
  trailing,
  elevated = false,
  disabled,
  titleProps,
  descriptionProps,
  sx,
  ...props
}: ListItemProps): JSX.Element {
  return (
    <ButtonBase
      {...props}
      disabled={disabled}
      sx={{
        width: '100%',
        borderRadius: radii.md,
        textAlign: 'left',
        padding: `${spacing.md}px ${spacing.lg}px`,
        gap: spacing.md,
        backgroundColor: colors.neutral.white,
        boxShadow: elevated ? shadows.level1 : 'none',
        opacity: disabled ? 0.6 : 1,
        '&:hover': {
          boxShadow: elevated ? shadows.level2 : 'none',
          backgroundColor: elevated ? colors.neutral.white : 'rgba(15, 91, 58, 0.04)',
        },
        ...sx,
      }}
    >
      {leading ? <Box display="flex" alignItems="center">{leading}</Box> : null}
      <Stack spacing={spacing.xs / 2} flex={1} minWidth={0}>
        <Typography
          variant="subtitle1"
          fontFamily={fontFamilies.sans}
          fontWeight={fontWeights.semibold}
          fontSize={fontSizes.md}
          color={colors.neutral.textPrimary}
          noWrap
          {...titleProps}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            variant="body2"
            fontFamily={fontFamilies.sans}
            fontSize={fontSizes.sm}
            color={colors.neutral.textSecondary}
            noWrap
            {...descriptionProps}
          >
            {description}
          </Typography>
        ) : null}
      </Stack>
      {trailing ? <Box marginLeft="auto" display="flex" alignItems="center">{trailing}</Box> : null}
    </ButtonBase>
  );
}
