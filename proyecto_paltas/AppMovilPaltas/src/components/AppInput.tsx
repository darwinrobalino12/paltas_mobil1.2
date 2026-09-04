import React from 'react';

import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';

export interface AppInputProps
  extends Omit<TextInputProps, 'style'> {
  label: string;

  error?: string;

  helperText?: string;

  accessibilityLabel?: string;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  helperText,
  accessibilityLabel,
  ...inputProps
}) => {
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.input,
          hasError && styles.inputError,
        ]}
      />

      {error ? (
        <Text
          style={styles.error}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },

  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 48,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: radius.md,

    backgroundColor: colors.background,
    color: colors.text,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,

    fontSize: typography.fontSize.md,
  },

  inputError: {
    borderColor: colors.error,
  },

  helper: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  error: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});