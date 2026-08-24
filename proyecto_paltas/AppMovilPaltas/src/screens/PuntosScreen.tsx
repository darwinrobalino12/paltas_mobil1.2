import React, { useEffect, useState } from 'react';

import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_BASE_URL } from '../config/api';

import {
  AsyncStateView,
  PlaceCard,
} from '../components';

import {
  colors,
  spacing,
  typography,
} from '../theme';

export const PuntosScreen = () => {
  const [puntos, setPuntos] = useState<any[]>([]);

  const [status, setStatus] = useState<
    'loading' | 'error' | 'empty' | 'success'
  >('loading');

  const [errorMsg, setErrorMsg] = useState('');

  const fetchPuntos = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/puntos-rapido`,
      );

      if (!response.ok) {
        throw new Error(
          `Código de respuesta ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setPuntos([]);
        setStatus('empty');
        return;
      }

      setPuntos(data);
      setStatus('success');
    } catch (error) {
      setErrorMsg(
        'No fue posible cargar los puntos de interés. Verifique la conexión e intente nuevamente.',
      );

      setStatus('error');
    }
  };

  useEffect(() => {
    fetchPuntos();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        Puntos de Interés - Paltas
      </Text>

      <AsyncStateView
        state={status}
        errorMessage={errorMsg}
        onRetry={fetchPuntos}
      >
        <FlatList
          data={puntos}
          keyExtractor={(item, index) =>
            item.id?.toString() ?? index.toString()
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const categoria =
              item.categoria?.nombre ?? 'General';

            const descripcion = item.descripcion
              ? `${categoria} · ${item.descripcion}`
              : categoria;

            return (
              <PlaceCard
                title={item.nombre}
                description={descripcion}
                imageUrl={item.imagen}
                onPress={() =>
                  console.log(
                    'Punto seleccionado:',
                    item.nombre,
                  )
                }
                accessibilityLabel={`Ver información de ${item.nombre}`}
              />
            );
          }}
        />
      </AsyncStateView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },

  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});