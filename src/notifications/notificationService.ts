import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { getMeta, setMeta } from '../storage/sqlite/schemaMeta';
import { EstadoPermiso } from '../permissions/types';

const CANAL_SINCRONIZACION = 'sincronizacion';
const CLAVE_PREFERENCIA = 'notificaciones_sincronizacion_activadas';

// Notifee no distingue "denegado" de "denegado permanente" como sí lo hace
// react-native-permissions: en ambos sistemas operativos, una vez que el
// usuario dice que no, ya no se puede volver a mostrar el diálogo nativo
// desde la app. Por eso tratamos cualquier DENIED como "denegado_permanente"
// (siempre se ofrece el botón de Ajustes) y solo NOT_DETERMINED como
// "denegado" (todavía se puede pedir).
function mapearEstadoNotificacion(authorizationStatus: AuthorizationStatus): EstadoPermiso {
  switch (authorizationStatus) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'concedido';
    case AuthorizationStatus.DENIED:
      return 'denegado_permanente';
    default:
      return 'denegado';
  }
}

// Se llama una sola vez al abrir la app (ver App.tsx). Crear el canal es
// idempotente y no pide ningún permiso: solo hay que hacerlo ANTES del primer
// envío, tal como pide el enunciado.
export async function crearCanalSincronizacion(): Promise<void> {
  await notifee.createChannel({
    id: CANAL_SINCRONIZACION,
    name: 'Sincronización de puntos de interés',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function verificarEstadoNotificaciones(): Promise<EstadoPermiso> {
  const settings = await notifee.getNotificationSettings();
  return mapearEstadoNotificacion(settings.authorizationStatus);
}

// Flujo JIT: se llama solo cuando el usuario toca "Activar avisos de
// sincronización" en Perfil, nunca al iniciar la app.
export async function solicitarPermisoNotificaciones(): Promise<EstadoPermiso> {
  const settings = await notifee.requestPermission();
  const estado = mapearEstadoNotificacion(settings.authorizationStatus);
  await setMeta(CLAVE_PREFERENCIA, estado === 'concedido' ? '1' : '0');
  return estado;
}

export async function notificacionesActivadasPorElUsuario(): Promise<boolean> {
  return (await getMeta(CLAVE_PREFERENCIA)) === '1';
}

// Nunca debe romper la sincronización: si el permiso no está concedido o algo
// falla al mostrar la notificación, se ignora en silencio (degradación
// elegante) — sincronizar los datos es lo importante, avisar es un extra.
export async function notificarSincronizacion(mensaje: string): Promise<void> {
  try {
    const activadoPorUsuario = await notificacionesActivadasPorElUsuario();
    if (!activadoPorUsuario) {
      return;
    }
    const estado = await verificarEstadoNotificaciones();
    if (estado !== 'concedido') {
      return;
    }
    await notifee.displayNotification({
      title: 'Puntos de interés sincronizados',
      body: mensaje,
      android: { channelId: CANAL_SINCRONIZACION, pressAction: { id: 'default' } },
    });
  } catch {
    // Ver comentario de la función: un fallo acá no debe afectar el resto de la app.
  }
}
