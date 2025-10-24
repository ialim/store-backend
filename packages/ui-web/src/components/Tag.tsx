import type { JSX } from 'react';
import Chip, { ChipProps } from '@mui/material/Chip';
import { colors, fontFamilies, fontSizes, fontWeights } from '@store/design-tokens';

type TagVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type TagTone = 'solid' | 'subtle';

export type TagProps = Omit<ChipProps, 'label' | 'color' | 'variant'> & {
  label: string;
  variant?: TagVariant;
  tone?: TagTone;
  uppercase?: boolean;
};

const paletteMap: Record<TagVariant, { solidBg: string; solidColor: string; subtleBg: string; subtleColor: string }> = {
  neutral: {
    solidBg: colors.neutral.textSecondary,
    solidColor: colors.neutral.white,
    subtleBg: '#eceff1',
    subtleColor: colors.neutral.textSecondary,
  },
  info: {
    solidBg: colors.state.info,
    solidColor: colors.neutral.white,
    subtleBg: colors.state.infoBg,
    subtleColor: colors.state.info,
  },
  success: {
    solidBg: colors.brand.primary,
    solidColor: colors.neutral.white,
    subtleBg: colors.feedback.successBg,
    subtleColor: colors.brand.primary,
  },
  warning: {
    solidBg: colors.state.warning,
    solidColor: colors.neutral.white,
    subtleBg: colors.state.warningBg,
    subtleColor: colors.state.warning,
  },
  danger: {
    solidBg: colors.state.danger,
    solidColor: colors.neutral.white,
    subtleBg: colors.state.dangerBg,
    subtleColor: colors.state.danger,
  },
};

export function Tag({
  label,
  variant = 'neutral',
  tone = 'subtle',
  uppercase = false,
  sx,
  ...props
}: TagProps): JSX.Element {
  const palette = paletteMap[variant];
  const backgroundColor = tone === 'solid' ? palette.solidBg : palette.subtleBg;
  const color = tone === 'solid' ? palette.solidColor : palette.subtleColor;

  return (
    <Chip
      {...props}
      label={uppercase ? label.toUpperCase() : label}
      sx={{
        backgroundColor,
        color,
        fontFamily: fontFamilies.sans,
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        letterSpacing: uppercase ? 0.6 : undefined,
        height: 24,
        ...sx,
      }}
    />
  );
}
