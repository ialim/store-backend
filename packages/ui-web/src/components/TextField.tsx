import type { JSX } from 'react';
import MuiTextField, { TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';
import { colors, radii, spacing, fontFamilies, fontSizes } from '@store/design-tokens';

export type TextFieldProps = MuiTextFieldProps;

export function TextField({
  sx,
  InputProps,
  InputLabelProps,
  ...props
}: TextFieldProps): JSX.Element {
  return (
    <MuiTextField
      {...props}
      InputLabelProps={{
        ...InputLabelProps,
        sx: {
          fontFamily: fontFamilies.sans,
          fontSize: fontSizes.sm,
          color: colors.neutral.textPrimary,
          ...InputLabelProps?.sx,
        },
      }}
      InputProps={{
        ...InputProps,
        sx: {
          borderRadius: radii.sm,
          backgroundColor: colors.neutral.white,
          fontFamily: fontFamilies.sans,
          fontSize: fontSizes.md,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d7dfdd',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.brand.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.brand.primary,
          },
          ...InputProps?.sx,
        },
      }}
      sx={{
        fontFamily: fontFamilies.sans,
        marginBottom: spacing.xs,
        ...sx,
      }}
    />
  );
}
