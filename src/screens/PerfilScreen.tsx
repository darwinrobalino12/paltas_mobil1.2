import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { RequireAuth } from '../navigation/RequireAuth';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { traducirError } from '../api/errors';
import { RemoteState, remoteIdle, remoteLoading, remoteSuccess, remoteError } from '../utils/remoteState';
import { EstadoPermiso } from '../permissions/types';
import { confirmarConUsuario } from '../permissions/rationale';
import { verificarEstadoNotificaciones, solicitarPermisoNotificaciones } from '../notifications/notificationService';
import { openSettings } from 'react-native-permissions';

const TEXTO_ESTADO: Record<EstadoPermiso, string> = {
  concedido: 'Activadas',
  denegado: 'Desactivadas',
  denegado_permanente: 'Bloqueadas por el sistema',
  no_disponible: 'No disponibles en este dispositivo',
};

function PerfilContenido() {
  const { usuario, logout } = useAuth();
  const { isOnline, pendingCount, syncing, sincronizarAhora } = useSync();
  const [diagnostico, setDiagnostico] = useState<RemoteState<{ mensaje: string }>>(remoteIdle());
  const [estadoNotificaciones, setEstadoNotificaciones] = useState<EstadoPermiso>('denegado');

  // Solo LEE el estado del permiso al entrar a la pantalla (no lo solicita):
  // "comprobar el estado del permiso antes de cada ejecución".
  useEffect(() => {
    verificarEstadoNotificaciones().then(setEstadoNotificaciones);
  }, []);

  const activarNotificaciones = async () => {
    if (estadoNotificaciones === 'denegado_permanente') {
      // Ya no se puede volver a mostrar el diálogo nativo: la única salida es Ajustes.
      await openSettings();
      return;
    }
    const aceptaVerRationale = await confirmarConUsuario(
      'Avisos de sincronización',
      'Podemos avisarte con una notificación cuando los puntos de interés guardados sin conexión terminen de sincronizarse con el servidor. ¿Quieres activarlas?'
    );
    if (!aceptaVerRationale) {
      return;
    }
    const nuevoEstado = await solicitarPermisoNotificaciones();
    setEstadoNotificaciones(nuevoEstado);
  };

  // Reubicado desde App.tsx: la prueba manual de conexión al backend que ya
  // existía, ahora vive como acción de diagnóstico dentro de Perfil. Usa
  // apiFetch (el único cliente HTTP del proyecto) en vez de un fetch suelto,
  // para que también pase por el tiempo de espera explícito.
  const probarConexion = async () => {
    setDiagnostico(remoteLoading());
    try {
      const response = await apiFetch('/saludo');
      const json = await parseJsonOrThrow<{ mensaje: string }>(response);
      setDiagnostico(remoteSuccess(json));
    } catch (error) {
      setDiagnostico(remoteError(traducirError(error)));
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

      <Text style={styles.subtitulo}>Notificaciones de sincronización</Text>
      <Text style={styles.dato}>Estado: {TEXTO_ESTADO[estadoNotificaciones]}</Text>
      {estadoNotificaciones !== 'concedido' && (
        <AppButton
          title={
            estadoNotificaciones === 'denegado_permanente'
              ? 'Abrir ajustes del sistema'
              : 'Activar avisos de sincronización'
          }
          onPress={activarNotificaciones}
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
  subtitulo: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  dato: { fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.sm },
  exito: { color: theme.colors.success, marginBottom: theme.spacing.sm },
  error: { color: theme.colors.error, marginBottom: theme.spacing.sm },
});
