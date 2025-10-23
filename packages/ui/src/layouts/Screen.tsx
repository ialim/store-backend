import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, spacing } from '@store/design-tokens';

export type ScreenProps = ViewProps & {
  padded?: boolean;
};

export function Screen({ style, padded = true, ...props }: ScreenProps) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        padded && styles.padded,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  padded: {
    padding: spacing.xl,
  },
});
