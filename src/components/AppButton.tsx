import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const AppButton = ({ title, onPress, disabled = false }: AppButtonProps) => {
  return (
    <TouchableOpacity 
      style={[styles.button, disabled && styles.disabled]} 
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={title}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.surface,
    fontWeight: typography.fontWeight.bold as '700',
    fontSize: typography.fontSize.md,
  }
});