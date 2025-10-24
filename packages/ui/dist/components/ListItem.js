import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, StyleSheet, Text, View, } from 'react-native';
import { colors, spacing, radii, fontSizes, nativeFontFamilies, fontWeights } from '@store/design-tokens';
export function ListItem({ title, description, leading, trailing, disabled, elevated = false, style, titleStyle, descriptionStyle, onPress, ...pressableProps }) {
    return (_jsxs(Pressable, { ...pressableProps, onPress: disabled ? undefined : onPress, style: ({ pressed }) => [
            styles.base,
            elevated && styles.elevated,
            disabled && styles.disabled,
            pressed && !disabled && styles.pressed,
            style,
        ], children: [leading ? _jsx(View, { style: styles.leading, children: leading }) : null, _jsxs(View, { style: styles.content, children: [_jsx(Text, { style: [styles.title, titleStyle], numberOfLines: 1, children: title }), description ? (_jsx(Text, { style: [styles.description, descriptionStyle], numberOfLines: 2, children: description })) : null] }), trailing ? _jsx(View, { style: styles.trailing, children: trailing }) : null] }));
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
        fontWeight: String(fontWeights.semibold),
        color: colors.neutral.textPrimary,
    },
    description: {
        fontFamily: nativeFontFamilies.sans,
        fontSize: fontSizes.sm,
        color: colors.neutral.textSecondary,
    },
});
//# sourceMappingURL=ListItem.js.map