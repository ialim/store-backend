import type { JSX } from 'react';
import { ViewStyle, TextStyle } from 'react-native';
export type NavBarProps = {
    title?: string;
    subtitle?: string;
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
    centerSlot?: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    titleStyle?: TextStyle | TextStyle[];
    subtitleStyle?: TextStyle | TextStyle[];
    showDivider?: boolean;
};
export declare function NavBar({ title, subtitle, leftSlot, rightSlot, centerSlot, style, titleStyle, subtitleStyle, showDivider, }: NavBarProps): JSX.Element;
//# sourceMappingURL=NavBar.d.ts.map