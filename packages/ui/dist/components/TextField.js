import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { StyleSheet, Text, TextInput, View, } from 'react-native';
import { colors, spacing, radii, nativeFontFamilies, fontSizes, fontWeights } from '@store/design-tokens';
export const TextField = React.forwardRef(({ label, helperText, containerStyle, error = false, style, ...inputProps }, ref) => {
    return (_jsxs(View, { style: [styles.container, containerStyle], children: [label ? _jsx(Text, { style: styles.label, children: label }) : null, _jsx(TextInput, { ref: ref, placeholderTextColor: colors.neutral.textSecondary, style: [
                    styles.input,
                    error && styles.inputError,
                    style,
                ], ...inputProps }), helperText ? (_jsx(Text, { style: [styles.helperText, error && styles.helperTextError], children: helperText })) : null] }));
});
TextField.displayName = 'TextField';
const styles = StyleSheet.create({
    container: {
        gap: spacing.xs,
    },
    label: {
        fontFamily: nativeFontFamilies.sans,
        fontSize: fontSizes.sm,
        fontWeight: String(fontWeights.semibold),
        color: colors.neutral.textPrimary,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d7dfdd',
        borderRadius: radii.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontFamily: nativeFontFamilies.sans,
        fontSize: fontSizes.md,
        color: colors.neutral.textPrimary,
        backgroundColor: colors.neutral.white,
    },
    inputError: {
        borderColor: '#d92d20',
    },
    helperText: {
        fontSize: fontSizes.xs,
        color: colors.neutral.textSecondary,
        fontFamily: nativeFontFamilies.sans,
    },
    helperTextError: {
        color: '#d92d20',
    },
});
//# sourceMappingURL=TextField.js.map