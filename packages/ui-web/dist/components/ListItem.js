import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { colors, spacing, radii, fontFamilies, fontSizes, fontWeights, shadows } from '@store/design-tokens';
export function ListItem({ title, description, leading, trailing, elevated = false, disabled, titleProps, descriptionProps, sx, ...props }) {
    return (_jsxs(ButtonBase, { ...props, disabled: disabled, sx: {
            width: '100%',
            borderRadius: radii.md,
            textAlign: 'left',
            padding: `${spacing.md}px ${spacing.lg}px`,
            gap: spacing.md,
            backgroundColor: colors.neutral.white,
            boxShadow: elevated ? shadows.level1 : 'none',
            opacity: disabled ? 0.6 : 1,
            '&:hover': {
                boxShadow: elevated ? shadows.level2 : 'none',
                backgroundColor: elevated ? colors.neutral.white : 'rgba(15, 91, 58, 0.04)',
            },
            ...sx,
        }, children: [leading ? _jsx(Box, { display: "flex", alignItems: "center", children: leading }) : null, _jsxs(Stack, { spacing: spacing.xs / 2, flex: 1, minWidth: 0, children: [_jsx(Typography, { variant: "subtitle1", fontFamily: fontFamilies.sans, fontWeight: fontWeights.semibold, fontSize: fontSizes.md, color: colors.neutral.textPrimary, noWrap: true, ...titleProps, children: title }), description ? (_jsx(Typography, { variant: "body2", fontFamily: fontFamilies.sans, fontSize: fontSizes.sm, color: colors.neutral.textSecondary, noWrap: true, ...descriptionProps, children: description })) : null] }), trailing ? _jsx(Box, { marginLeft: "auto", display: "flex", alignItems: "center", children: trailing }) : null] }));
}
//# sourceMappingURL=ListItem.js.map