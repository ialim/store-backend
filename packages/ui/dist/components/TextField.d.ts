import React from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
export type TextFieldProps = TextInputProps & {
    label?: string;
    helperText?: string;
    containerStyle?: ViewStyle | ViewStyle[];
    error?: boolean;
};
export declare const TextField: React.ForwardRefExoticComponent<TextInputProps & {
    label?: string;
    helperText?: string;
    containerStyle?: ViewStyle | ViewStyle[];
    error?: boolean;
} & React.RefAttributes<TextInput>>;
//# sourceMappingURL=TextField.d.ts.map