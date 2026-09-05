import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CatalogoStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { AsyncStateView } from '../components/AsyncStateView';
import { RemoteState, remoteLoading, remoteSuccess, remoteError } from '../utils/remoteState';
import { obtenerPuntoLocalPorId, PuntoLocal } from '../storage/sqlite/puntosRepository';
import { obtenerPuntoPorId } from '../api/puntos';
import { API_HOST } from '../config/api';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'DetallePunto'>;

function estadoAVista(estado: RemoteState<PuntoLocal>): { status: 'loading' | 'error' | 'empty' | 'success'; errorMessage?: string } {
  if (estado.status === 'idle' || estado.status === 'loading') {
    return { status: 'loading' };
  }
  if (estado.status === 'error') {
    return { status: 'error', errorMessage: estado.error };
  }
  return { status: 'success' };
}

// Se reconstruye SOLO a partir de route.params.id (nunca recibe el objeto completo
// por navegación): primero pinta desde SQLite si ya existe, y refresca en background.
export const DetallePuntoScreen = ({ route }: Props) => {
  const { id } = route.params;
  const [estado, setEstado] = useState<RemoteState<PuntoLocal>>(remoteLoading());

  const cargar = useCallback(async () => {
    const local = await obtenerPuntoLocalPorId(id);
    if (local) {
      setEstado(remoteSuccess(local));
    } else {
      setEstado(remoteLoading());
    }

    try {
      const remoto = await obtenerPuntoPorId(id);
      setEstado(
        remoteSuccess({
          id: String(remoto.id),
          nombre: remoto.nombre,
          descripcion: remoto.descripcion,
          categoriaId: remoto.categoriaId,
          categoriaNombre: remoto.categoria?.nombre ?? null,
          serverUpdatedAt: remoto.updatedAt ?? null,
          pendingSync: false,
          latitud: remoto.latitud ?? null,
          longitud: remoto.longitud ?? null,
          imagenUrl: remoto.imagenUrl ?? null,
        })
      );
    } catch {
      if (!local) {
        setEstado(remoteError('No se pudo cargar el punto de interés. Verifica tu conexión.'));
      }
      // Si ya había versión local, se conserva (cache-first): nunca pantalla vacía.
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const verEnElMapa = (latitud: number, longitud: number) => {
    Linking.openURL(`geo:${latitud},${longitud}?q=${latitud},${longitud}`);
  };

  return (
    <View style={styles.container}>
      <AsyncStateView {...estadoAVista(estado)} onRetry={cargar}>
        {estado.status === 'success' && (
          <ScrollView>
            {estado.data.imagenUrl && (
              <Image source={{ uri: `${API_HOST}${estado.data.imagenUrl}` }} style={styles.imagen} />
            )}
            <Text style={styles.categoria}>{(estado.data.categoriaNombre || 'General').toUpperCase()}</Text>
            <Text style={styles.titulo}>{estado.data.nombre}</Text>
            {estado.data.descripcion ? <Text style={styles.descripcion}>{estado.data.descripcion}</Text> : null}
            {estado.data.latitud != null && estado.data.longitud != null && (
              <TouchableOpacity onPress={() => verEnElMapa(estado.data.latitud as number, estado.data.longitud as number)}>
                <Text style={styles.enlaceMapa}>📍 Ver en el mapa</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </AsyncStateView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  imagen: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  categoria: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold', marginBottom: theme.spacing.xs },
  titulo: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.sm },
  descripcion: { fontSize: 16, color: theme.colors.textSecondary },
  enlaceMapa: { fontSize: 16, color: theme.colors.primary, fontWeight: 'bold', marginTop: theme.spacing.md },
});
