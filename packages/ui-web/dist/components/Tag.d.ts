import type { JSX } from 'react';
import { ChipProps } from '@mui/material/Chip';
type TagVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type TagTone = 'solid' | 'subtle';
export type TagProps = Omit<ChipProps, 'label' | 'color' | 'variant'> & {
    label: string;
    variant?: TagVariant;
    tone?: TagTone;
    uppercase?: boolean;
};
export declare function Tag({ label, variant, tone, uppercase, sx, ...props }: TagProps): JSX.Element;
export {};
//# sourceMappingURL=Tag.d.ts.map