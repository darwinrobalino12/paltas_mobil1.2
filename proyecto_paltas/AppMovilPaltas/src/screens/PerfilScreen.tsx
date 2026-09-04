import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { RequireAuth } from '../navigation/RequireAuth';
import { API_BASE_URL } from '../config/api';
import { RemoteState, remoteIdle, remoteLoading, remoteSuccess, remoteError } from '../utils/remoteState';

function PerfilContenido() {
  const { usuario, logout } = useAuth();
  const { isOnline, pendingCount, syncing, sincronizarAhora } = useSync();
  const [diagnostico, setDiagnostico] = useState<RemoteState<{ mensaje: string }>>(remoteIdle());

  // Reubicado desde App.tsx: la prueba manual de conexión al backend que ya
  // existía, ahora vive como acción de diagnóstico dentro de Perfil.
  const probarConexion = async () => {
    setDiagnostico(remoteLoading());
    try {
      const response = await fetch(`${API_BASE_URL}/saludo`);
      const json = await response.json();
      setDiagnostico(remoteSuccess(json));
    } catch {
      setDiagnostico(remoteError('No se pudo conectar al backend. ¿Está encendido el servidor?'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Perfil</Text>
      <Text style={styles.dato}>Usuario: {usuario?.username}</Text>
      <Text style={styles.dato}>Rol: {usuario?.rol}</Text>
      <Text style={styles.dato}>Conexión: {isOnline ? 'En línea' : 'Sin conexión'}</Text>
      <Text style={styles.dato}>Operaciones pendientes de sincronizar: {pendingCount}</Text>

      {pendingCount > 0 && (
        <AppButton
          title={syncing ? 'Sincronizando...' : 'Reintentar sincronización'}
          onPress={sincronizarAhora}
          disabled={syncing}
        />
      )}

      <AppButton title="Probar conexión con el backend" onPress={probarConexion} />
      {diagnostico.status === 'loading' && <Text style={styles.dato}>Probando...</Text>}
      {diagnostico.status === 'success' && <Text style={styles.exito}>{diagnostico.data.mensaje}</Text>}
      {diagnostico.status === 'error' && <Text style={styles.error}>{diagnostico.error}</Text>}

      <AppButton title="Cerrar sesión" onPress={logout} />
    </View>
  );
}

export const PerfilScreen = () => (
  <RequireAuth>
    <PerfilContenido />
  </RequireAuth>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  titulo: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  dato: { fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.sm },
  exito: { color: theme.colors.success, marginBottom: theme.spacing.sm },
  error: { color: theme.colors.error, marginBottom: theme.spacing.sm },
});
