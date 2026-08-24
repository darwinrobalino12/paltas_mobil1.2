// src/theme/tokens.ts
export const tokens = {
  colors: {
    green600: '#1B5E20',
    grey100: '#F5F5F5',
    grey900: '#212121',
    red700: '#C62828',
    white: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  }
};

export const theme = {
  colors: {
    primary: tokens.colors.green600,
    background: tokens.colors.grey100,
    text: tokens.colors.grey900,
    error: tokens.colors.red700,
  },
  spacing: tokens.spacing,
};