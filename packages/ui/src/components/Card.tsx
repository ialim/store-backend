import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radii, spacing, shadows } from '@store/design-tokens';

export type CardProps = ViewProps & {
  padding?: keyof typeof spacing;
};

export function Card({ style, padding = 'lg', ...viewProps }: CardProps) {
  return (
    <View
      {...viewProps}
      style={[
        styles.base,
        { padding: spacing[padding] ?? spacing.lg },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.neutral.white,
    borderRadius: radii.lg,
    shadowColor: colors.brand.primary,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
});
