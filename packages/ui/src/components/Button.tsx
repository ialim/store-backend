import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, nativeFontFamilies, fontWeights } from '@store/design-tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  onPress?: (event: GestureResponderEvent) => void;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth,
  style,
  onPress,
  ...pressableProps
}: ButtonProps) {
  const composedStyle = [
    styles.base,
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];
  const textStyles = [
    styles.label,
    variant === 'ghost' && styles.labelGhost,
    disabled && styles.labelDisabled,
  ];

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        composedStyle,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.brand.primary : colors.neutral.white} />
      ) : (
        <Text style={textStyles}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.brand.primary,
  },
  secondary: {
    backgroundColor: colors.brand.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: '#c8dcd3',
    borderColor: '#c8dcd3',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    color: colors.neutral.white,
    fontFamily: nativeFontFamilies.sans,
    fontSize: 16,
    fontWeight: String(fontWeights.semibold) as TextStyle['fontWeight'],
  },
  labelGhost: {
    color: colors.brand.primary,
  },
  labelDisabled: {
    color: '#ffffff',
  },
});
