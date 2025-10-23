import type { JSX } from 'react';
import { PressableProps, ViewStyle, TextStyle } from 'react-native';
export type ListItemProps = Omit<PressableProps, 'style'> & {
    title: string;
    description?: string;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    disabled?: boolean;
    elevated?: boolean;
    style?: ViewStyle | ViewStyle[];
    titleStyle?: TextStyle | TextStyle[];
    descriptionStyle?: TextStyle | TextStyle[];
};
export declare function ListItem({ title, description, leading, trailing, disabled, elevated, style, titleStyle, descriptionStyle, onPress, ...pressableProps }: ListItemProps): JSX.Element;
//# sourceMappingURL=ListItem.d.ts.map