import React from 'react';

import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../theme';

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
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 48,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: radius.md,

    backgroundColor: colors.background,
    color: colors.textPrimary,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,

    ...typography.body,
  },

  inputError: {
    borderColor: colors.error,
  },

  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});