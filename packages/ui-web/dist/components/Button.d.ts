import type { JSX } from 'react';
import { ButtonProps as MuiButtonProps } from '@mui/material/Button';
type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonProps = Omit<MuiButtonProps, 'children' | 'variant' | 'color'> & {
    label: string;
    variant?: ButtonVariant;
    loading?: boolean;
};
export declare function Button({ label, variant, loading, disabled, sx, ...props }: ButtonProps): JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map