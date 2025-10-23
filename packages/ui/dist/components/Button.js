import { jsx as _jsx } from "react/jsx-runtime";
import { ActivityIndicator, Pressable, StyleSheet, Text, } from 'react-native';
import { colors, radii, spacing, nativeFontFamilies, fontWeights } from '@store/design-tokens';
export function Button({ label, variant = 'primary', loading = false, disabled, fullWidth, style, onPress, ...pressableProps }) {
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
    return (_jsx(Pressable, { ...pressableProps, accessibilityRole: "button", onPress: disabled || loading ? undefined : onPress, style: ({ pressed }) => [
            composedStyle,
            pressed && !disabled && styles.pressed,
        ], children: loading ? (_jsx(ActivityIndicator, { color: variant === 'ghost' ? colors.brand.primary : colors.neutral.white })) : (_jsx(Text, { style: textStyles, children: label })) }));
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
        fontWeight: String(fontWeights.semibold),
    },
    labelGhost: {
        color: colors.brand.primary,
    },
    labelDisabled: {
        color: '#ffffff',
    },
});
//# sourceMappingURL=Button.js.map