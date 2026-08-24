
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface AppButtonProps {
  title: string;
  onPress: () => void;

  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;

  accessibilityLabel?: string;
  testID?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  testID,
}) => {
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) {
      return colors.border;
    }

    if (variant === 'secondary') {
      return colors.surface;
    }

    if (variant === 'danger') {
      return colors.error;
    }

    return colors.primary;
  };

  const getTextColor = () => {
    if (isDisabled) {
      return colors.textDisabled;
    }

    if (variant === 'secondary') {
      return colors.primary;
    }

    return colors.background;
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Cargando"
          color={getTextColor()}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,

    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,

    borderRadius: radius.md,

    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    ...typography.button,
  },
});