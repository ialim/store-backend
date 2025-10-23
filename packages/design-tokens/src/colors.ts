export const colors = {
  brand: {
    primary: '#0f5b3a',
    primaryDark: '#0b3f29',
    primaryLight: '#2c7b54',
    accent: '#ff8a3d',
  },
  neutral: {
    canvas: '#f3f6f9',
    white: '#ffffff',
    black: '#000000',
    textPrimary: '#1c262b',
    textSecondary: '#5f6b6b',
  },
  feedback: {
    successBg: '#d9f0e4',
  },
} as const;

export type ColorTokenGroup = typeof colors;
