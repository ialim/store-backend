import { jsx as _jsx } from "react/jsx-runtime";
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { colors, radii, spacing, fontFamilies, fontWeights } from '@store/design-tokens';
const variantStyles = {
    primary: {
        backgroundColor: colors.brand.primary,
        color: colors.neutral.white,
        '&:hover': {
            backgroundColor: colors.brand.primaryDark,
        },
    },
    secondary: {
        backgroundColor: colors.brand.accent,
        color: colors.neutral.white,
        '&:hover': {
            backgroundColor: '#f97316',
        },
    },
    ghost: {
        backgroundColor: 'transparent',
        border: `1px solid ${colors.brand.primary}`,
        color: colors.brand.primary,
        '&:hover': {
            backgroundColor: 'rgba(15, 91, 58, 0.08)',
        },
    },
};
export function Button({ label, variant = 'primary', loading = false, disabled, sx, ...props }) {
    return (_jsx(MuiButton, { ...props, disabled: disabled || loading, sx: {
            borderRadius: radii.pill,
            textTransform: 'none',
            fontFamily: fontFamilies.sans,
            fontWeight: fontWeights.semibold,
            paddingBlock: spacing.sm,
            paddingInline: spacing.lg,
            minHeight: 48,
            gap: spacing.sm,
            boxShadow: variant === 'ghost' ? 'none' : '0 12px 24px rgba(15, 91, 58, 0.08)',
            ...variantStyles[variant],
            ...(Array.isArray(sx) ? Object.assign({}, ...sx) : sx),
        }, children: loading ? _jsx(CircularProgress, { size: 20, color: "inherit" }) : label }));
}
//# sourceMappingURL=Button.js.map