import type { JSX } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, radii, fontSizes, nativeFontFamilies, fontWeights } from '@store/design-tokens';

export type ListItemProps = Omit<PressableProps, 'style'> & {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
  elevated?: boolean;
  style?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
  descriptionStyle?: TextStyle | TextStyle[];
};

export function ListItem({
  title,
  description,
  leading,
  trailing,
  disabled,
  elevated = false,
  style,
  titleStyle,
  descriptionStyle,
  onPress,
  ...pressableProps
}: ListItemProps): JSX.Element {
  return (
    <Pressable
      {...pressableProps}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        elevated && styles.elevated,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.description, descriptionStyle]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.white,
    gap: spacing.md,
  },
  elevated: {
    shadowColor: colors.brand.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  leading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailing: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  title: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: String(fontWeights.semibold) as TextStyle['fontWeight'],
    color: colors.neutral.textPrimary,
  },
  description: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.sm,
    color: colors.neutral.textSecondary,
  },
});
