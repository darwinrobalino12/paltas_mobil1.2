import React from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from './AppButton';

import {
  colors,
  spacing,
  typography,
} from '../theme';

export type AsyncState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success';

export interface AsyncStateViewProps {
  state: AsyncState;

  children?: React.ReactNode;

  emptyTitle?: string;
  emptyMessage?: string;

  errorTitle?: string;
  errorMessage?: string;

  onRetry?: () => void;
}

export const AsyncStateView: React.FC<
  AsyncStateViewProps
> = ({
  state,
  children,

  emptyTitle = 'No hay información',
  emptyMessage = 'No encontramos datos para mostrar.',

  errorTitle = 'Ocurrió un error',
  errorMessage = 'No fue posible cargar la información.',

  onRetry,
}) => {
  if (state === 'loading') {
    return (
      <View
        style={styles.container}
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando información"
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.message}>
          Cargando...
        </Text>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {emptyTitle}
        </Text>

        <Text style={styles.message}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {errorTitle}
        </Text>

        <Text style={styles.message}>
          {errorMessage}
        </Text>

        {onRetry ? (
          <AppButton
            title="Intentar nuevamente"
            onPress={onRetry}
            variant="primary"
            accessibilityLabel="Intentar cargar la información nuevamente"
          />
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    padding: spacing.lg,
  },

  title: {
    ...typography.heading,

    color: colors.textPrimary,

    textAlign: 'center',

    marginBottom: spacing.sm,
  },

  message: {
    ...typography.body,

    color: colors.textSecondary,

    textAlign: 'center',

    marginTop: spacing.sm,
  },
});