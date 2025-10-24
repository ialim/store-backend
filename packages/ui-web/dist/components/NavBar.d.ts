import type { JSX } from 'react';
export type NavBarProps = {
    title?: string;
    subtitle?: string;
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
    centerSlot?: React.ReactNode;
    showDivider?: boolean;
    sx?: Record<string, unknown>;
};
export declare function NavBar({ title, subtitle, leftSlot, rightSlot, centerSlot, showDivider, sx, }: NavBarProps): JSX.Element;
//# sourceMappingURL=NavBar.d.ts.map