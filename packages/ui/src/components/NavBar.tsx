import type { JSX } from 'react';
import { Platform, StatusBar, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, nativeFontFamilies, fontSizes, fontWeights } from '@store/design-tokens';

export type NavBarProps = {
  title?: string;
  subtitle?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
  subtitleStyle?: TextStyle | TextStyle[];
  showDivider?: boolean;
};

export function NavBar({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  centerSlot,
  style,
  titleStyle,
  subtitleStyle,
  showDivider = false,
}: NavBarProps): JSX.Element {
  return (
    <View style={[styles.wrapper, showDivider && styles.withDivider]}>
      <View style={[styles.container, style]}>
        <View style={styles.side}>{leftSlot}</View>
        <View style={styles.center}>
          {centerSlot ?? (
            <>
              {title ? (
                <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <View style={[styles.side, styles.alignEnd]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    backgroundColor: colors.neutral.white,
  },
  withDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28, 38, 43, 0.12)',
  },
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  side: {
    minWidth: 48,
    justifyContent: 'center',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  title: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: String(fontWeights.semibold) as TextStyle['fontWeight'],
    color: colors.neutral.textPrimary,
  },
  subtitle: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.sm,
    color: colors.neutral.textSecondary,
  },
});
