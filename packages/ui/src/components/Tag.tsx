import type { JSX } from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, radii, fontSizes, nativeFontFamilies, fontWeights } from '@store/design-tokens';

type TagVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type TagTone = 'solid' | 'subtle';

export type TagProps = {
  label: string;
  variant?: TagVariant;
  tone?: TagTone;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  uppercase?: boolean;
};

const variantStyles: Record<TagVariant, { solidBg: string; solidColor: string; subtleBg: string; subtleColor: string }> = {
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
  style,
  textStyle,
  uppercase = false,
}: TagProps): JSX.Element {
  const palette = variantStyles[variant];
  const backgroundColor = tone === 'solid' ? palette.solidBg : palette.subtleBg;
  const color = tone === 'solid' ? palette.solidColor : palette.subtleColor;

  return (
    <View style={[styles.base, { backgroundColor }, style]}>
      <Text
        style={[
          styles.label,
          { color },
          uppercase && styles.uppercase,
          textStyle,
        ]}
      >
        {uppercase ? label.toUpperCase() : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: String(fontWeights.semibold) as TextStyle['fontWeight'],
  },
  uppercase: {
    letterSpacing: 0.6,
  },
});
