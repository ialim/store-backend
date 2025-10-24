import { jsx as _jsx } from "react/jsx-runtime";
import Box from '@mui/material/Box';
import { colors, spacing } from '@store/design-tokens';
export function Screen({ padded = true, sx, ...props }) {
    return (_jsx(Box, { ...props, sx: {
            minHeight: '100vh',
            backgroundColor: colors.neutral.canvas,
            padding: padded ? spacing.xl : 0,
            ...sx,
        } }));
}
//# sourceMappingURL=Screen.js.map