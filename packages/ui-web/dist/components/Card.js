import { jsx as _jsx } from "react/jsx-runtime";
import Paper from '@mui/material/Paper';
import { colors, radii, shadows, spacing } from '@store/design-tokens';
export function Card({ padding = 'xl', sx, ...props }) {
    return (_jsx(Paper, { elevation: 0, ...props, sx: {
            borderRadius: radii.lg,
            backgroundColor: colors.neutral.white,
            boxShadow: shadows.card,
            padding: spacing[padding] ?? spacing.lg,
            ...sx,
        } }));
}
//# sourceMappingURL=Card.js.map