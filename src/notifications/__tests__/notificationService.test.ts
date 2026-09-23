import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { verificarEstadoNotificaciones } from '../notificationService';

// @notifee/react-native está mockeado globalmente (jest.setup.js) con el
// mock oficial del paquete. mapearEstadoNotificacion no está exportado —
// se prueba a través de verificarEstadoNotificaciones(), como la usa de
// verdad PerfilScreen.
const getNotificationSettingsMock = notifee.getNotificationSettings as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe('verificarEstadoNotificaciones — mapea AuthorizationStatus a EstadoPermiso', () => {
  it.each([
    [AuthorizationStatus.AUTHORIZED, 'concedido'],
    [AuthorizationStatus.PROVISIONAL, 'concedido'],
    [AuthorizationStatus.DENIED, 'denegado_permanente'],
    [AuthorizationStatus.NOT_DETERMINED, 'denegado'],
  ])('authorizationStatus %s se traduce a %s', async (authorizationStatus, estadoEsperado) => {
    getNotificationSettingsMock.mockResolvedValueOnce({ authorizationStatus });

    const estado = await verificarEstadoNotificaciones();

    expect(estado).toBe(estadoEsperado);
  });
});
