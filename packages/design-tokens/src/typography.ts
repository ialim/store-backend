export const fontFamilies = {
  sans: `"Inter", "Helvetica Neue", Arial, sans-serif`,
  mono: `"Roboto Mono", "Fira Code", monospace`,
} as const;

export const nativeFontFamilies = {
  sans: 'System',
  mono: 'Courier',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 30,
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FontFamilyToken = keyof typeof fontFamilies;
export type NativeFontToken = keyof typeof nativeFontFamilies;
