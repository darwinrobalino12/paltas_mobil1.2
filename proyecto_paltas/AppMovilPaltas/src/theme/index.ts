import { colors, primitiveColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radius } from './radius';

export const theme = {
  colors,
  primitiveColors,
  spacing,
  typography,
  radius,
};

export type AppTheme = typeof theme;

export {
  colors,
  primitiveColors,
  spacing,
  typography,
  radius,
};