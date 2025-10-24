export const spacingUnit = 4;

export const spacing = {
  none: 0,
  xs: spacingUnit,
  sm: spacingUnit * 2,
  md: spacingUnit * 3,
  lg: spacingUnit * 4,
  xl: spacingUnit * 6,
  '2xl': spacingUnit * 8,
} as const;

export type SpacingToken = keyof typeof spacing;
