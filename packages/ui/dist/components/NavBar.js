import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, nativeFontFamilies, fontSizes, fontWeights } from '@store/design-tokens';
export function NavBar({ title, subtitle, leftSlot, rightSlot, centerSlot, style, titleStyle, subtitleStyle, showDivider = false, }) {
    return (_jsx(View, { style: [styles.wrapper, showDivider && styles.withDivider], children: _jsxs(View, { style: [styles.container, style], children: [_jsx(View, { style: styles.side, children: leftSlot }), _jsx(View, { style: styles.center, children: centerSlot ?? (_jsxs(_Fragment, { children: [title ? (_jsx(Text, { style: [styles.title, titleStyle], numberOfLines: 1, children: title })) : null, subtitle ? (_jsx(Text, { style: [styles.subtitle, subtitleStyle], numberOfLines: 1, children: subtitle })) : null] })) }), _jsx(View, { style: [styles.side, styles.alignEnd], children: rightSlot })] }) }));
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
        fontWeight: String(fontWeights.semibold),
        color: colors.neutral.textPrimary,
    },
    subtitle: {
        fontFamily: nativeFontFamilies.sans,
        fontSize: fontSizes.sm,
        color: colors.neutral.textSecondary,
    },
});
//# sourceMappingURL=NavBar.js.map