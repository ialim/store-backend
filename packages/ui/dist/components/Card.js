import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '@store/design-tokens';
export function Card({ style, padding = 'lg', ...viewProps }) {
    return (_jsx(View, { ...viewProps, style: [
            styles.base,
            { padding: spacing[padding] ?? spacing.lg },
            style,
        ] }));
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
//# sourceMappingURL=Card.js.map