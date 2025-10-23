import type { JSX } from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type TagVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type TagTone = 'solid' | 'subtle';
export type TagProps = {
    label: string;
    variant?: TagVariant;
    tone?: TagTone;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    uppercase?: boolean;
};
export declare function Tag({ label, variant, tone, style, textStyle, uppercase, }: TagProps): JSX.Element;
export {};
//# sourceMappingURL=Tag.d.ts.map