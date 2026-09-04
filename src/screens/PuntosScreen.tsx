import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CatalogoStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { PlaceCard } from '../components/PlaceCard';
import { AsyncStateView } from '../components/AsyncStateView';
import { AppButton } from '../components/AppButton';
import { RemoteState, remoteLoading, remoteSuccess, remoteError, toAsyncViewProps } from '../utils/remoteState';
import { sincronizarPuntos, PuntoLocal } from '../storage/sqlite/puntosRepository';
import { useSync } from '../context/SyncContext';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'ListaPuntos'>;

// Catálogo de la Semana 10, ahora conectado al tipo cerrado RemoteState<T> y a la
// caché SQLite (cache-first: lee lo local primero, la pantalla nunca queda vacía).
export const PuntosScreen = ({ navigation }: Props) => {
  const [estado, setEstado] = useState<RemoteState<PuntoLocal[]>>(remoteLoading());
  const [cacheVencida, setCacheVencida] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const { pendingCount } = useSync();

  const cargar = useCallback(async (forzar = false) => {
    if (!forzar) {
      setEstado(remoteLoading());
    }
    try {
      const resultado = await sincronizarPuntos(forzar);
      setEstado(remoteSuccess(resultado.puntos));
      setCacheVencida(resultado.cacheVencida);
      setUltimaSincronizacion(resultado.ultimaSincronizacion);
    } catch {
      setEstado(remoteError('No se pudo cargar el catálogo.'));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar(true);
    setRefrescando(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Puntos de Interés - Paltas</Text>

      {pendingCount > 0 && (
        <View style={styles.bannerPendientes}>
          <Text style={styles.bannerTexto}>
            {pendingCount} {pendingCount === 1 ? 'creación pendiente' : 'creaciones pendientes'} de sincronizar
          </Text>
        </View>
      )}

      {cacheVencida && (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>
            Datos posiblemente desactualizados
            {ultimaSincronizacion ? ` · Última sincronización: ${new Date(ultimaSincronizacion).toLocaleString()}` : ''}
          </Text>
        </View>
      )}

      <AsyncStateView {...toAsyncViewProps(estado)} onRetry={() => cargar(true)}>
        <FlatList
          data={estado.status === 'success' ? estado.data : []}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <PlaceCard
              titulo={item.nombre}
              categoria={item.categoriaNombre || 'General'}
              descripcion={item.descripcion || undefined}
              onPulsar={() => navigation.navigate('DetallePunto', { id: item.id })}
            />
          )}
        />
      </AsyncStateView>

      <AppButton title="+ Agregar punto de interés" onPress={() => navigation.navigate('CrearPunto')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  banner: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  bannerPendientes: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  bannerTexto: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
