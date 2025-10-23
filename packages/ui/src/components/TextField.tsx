import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, radii, nativeFontFamilies, fontSizes, fontWeights } from '@store/design-tokens';

export type TextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  error?: boolean;
};

export const TextField = React.forwardRef<TextInput, TextFieldProps>(
  ({ label, helperText, containerStyle, error = false, style, ...inputProps }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.neutral.textSecondary}
          style={[
            styles.input,
            error && styles.inputError,
            style,
          ]}
          {...inputProps}
        />
        {helperText ? (
          <Text style={[styles.helperText, error && styles.helperTextError]}>
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: String(fontWeights.semibold) as TextStyle['fontWeight'],
    color: colors.neutral.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7dfdd',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.md,
    color: colors.neutral.textPrimary,
    backgroundColor: colors.neutral.white,
  },
  inputError: {
    borderColor: '#d92d20',
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.neutral.textSecondary,
    fontFamily: nativeFontFamilies.sans,
  },
  helperTextError: {
    color: '#d92d20',
  },
});
