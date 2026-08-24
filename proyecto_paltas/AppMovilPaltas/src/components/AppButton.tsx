import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/tokens';

interface AppButtonProps {
  title: string;
  onPress: () => void; // Devolución de llamada
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
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  }
});