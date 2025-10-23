import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { colors, spacing, fontFamilies, fontSizes, fontWeights } from '@store/design-tokens';
export function NavBar({ title, subtitle, leftSlot, rightSlot, centerSlot, showDivider = false, sx, }) {
    return (_jsx(Box, { sx: {
            backgroundColor: colors.neutral.white,
            borderBottom: showDivider ? `1px solid rgba(28, 38, 43, 0.12)` : 'none',
            paddingInline: spacing.lg,
            ...sx,
        }, children: _jsxs(Box, { sx: {
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
            }, children: [_jsx(Box, { minWidth: 48, display: "flex", alignItems: "center", justifyContent: "flex-start", children: leftSlot }), _jsx(Box, { flex: 1, minWidth: 0, children: centerSlot ?? (_jsxs(Stack, { spacing: spacing.xs / 2, minWidth: 0, children: [title ? (_jsx(Typography, { fontFamily: fontFamilies.sans, fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.neutral.textPrimary, noWrap: true, children: title })) : null, subtitle ? (_jsx(Typography, { fontFamily: fontFamilies.sans, fontSize: fontSizes.sm, color: colors.neutral.textSecondary, noWrap: true, children: subtitle })) : null] })) }), _jsx(Box, { minWidth: 48, display: "flex", alignItems: "center", justifyContent: "flex-end", children: rightSlot })] }) }));
}
//# sourceMappingURL=NavBar.js.map