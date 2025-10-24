import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@store/design-tokens';
export function Screen({ style, padded = true, ...props }) {
    return (_jsx(View, { ...props, style: [
            styles.base,
            padded && styles.padded,
            style,
        ] }));
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
//# sourceMappingURL=Screen.js.map