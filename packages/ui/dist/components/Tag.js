import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radii, fontSizes, nativeFontFamilies, fontWeights } from '@store/design-tokens';
const variantStyles = {
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
export function Tag({ label, variant = 'neutral', tone = 'subtle', style, textStyle, uppercase = false, }) {
    const palette = variantStyles[variant];
    const backgroundColor = tone === 'solid' ? palette.solidBg : palette.subtleBg;
    const color = tone === 'solid' ? palette.solidColor : palette.subtleColor;
    return (_jsx(View, { style: [styles.base, { backgroundColor }, style], children: _jsx(Text, { style: [
                styles.label,
                { color },
                uppercase && styles.uppercase,
                textStyle,
            ], children: uppercase ? label.toUpperCase() : label }) }));
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
        fontWeight: String(fontWeights.semibold),
    },
    uppercase: {
        letterSpacing: 0.6,
    },
});
//# sourceMappingURL=Tag.js.map