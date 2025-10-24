import { GestureResponderEvent, PressableProps, ViewStyle } from 'react-native';
type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
    label: string;
    variant?: ButtonVariant;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle | ViewStyle[];
    onPress?: (event: GestureResponderEvent) => void;
};
export declare function Button({ label, variant, loading, disabled, fullWidth, style, onPress, ...pressableProps }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map