export const primitiveColors = {
  green600: '#1B5E20',
  grey100: '#F5F5F5',
  grey600: '#757575',
  grey900: '#212121',
  red700: '#C62828',
  white: '#FFFFFF',
} as const;

export const colors = {
  primary: primitiveColors.green600,

  background: primitiveColors.grey100,
  surface: primitiveColors.white,

  textPrimary: primitiveColors.grey900,
  textSecondary: primitiveColors.grey600,
  textDisabled: primitiveColors.grey600,

  error: primitiveColors.red700,

  border: primitiveColors.grey600,
} as const;