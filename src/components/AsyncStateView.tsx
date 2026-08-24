import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../theme'; // <-- CORREGIDO: Ahora apunta al index central del tema
import { AppButton } from './AppButton';

interface AsyncStateViewProps {
  status: 'loading' | 'error' | 'empty' | 'success';
  errorMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const AsyncStateView = ({ status, errorMessage, onRetry, children }: AsyncStateViewProps) => {
  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Cargando información del servidor...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>¡Ocurrió un problema!</Text>
        <Text style={styles.text}>{errorMessage || 'No se pudo conectar con el servidor backend.'}</Text>
        {onRetry && <AppButton title="Reintentar Conexión" onPress={onRetry} />}
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>No se encontraron registros disponibles en este momento.</Text>
      </View>
    );
  }

  // Caso feliz (Success)
  return <>{children}</>;
};

const styles = StyleSheet.create({
  centered: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorTitle: {
    color: theme.colors.error,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});