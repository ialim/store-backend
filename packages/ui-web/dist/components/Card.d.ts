import type { JSX } from 'react';
import { PaperProps } from '@mui/material/Paper';
import { spacing } from '@store/design-tokens';
export type CardProps = PaperProps & {
    padding?: keyof typeof spacing;
};
export declare function Card({ padding, sx, ...props }: CardProps): JSX.Element;
//# sourceMappingURL=Card.d.ts.map