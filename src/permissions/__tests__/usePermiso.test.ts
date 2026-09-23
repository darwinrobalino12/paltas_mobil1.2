import { renderHook, act } from '@testing-library/react-native';
import { check, request, openSettings, RESULTS, Permission } from 'react-native-permissions';
import { usePermiso } from '../usePermiso';

// react-native-permissions está mockeado globalmente en jest.setup.js.
const checkMock = check as jest.Mock;
const requestMock = request as jest.Mock;
const openSettingsMock = openSettings as jest.Mock;

const PERMISO_DE_PRUEBA = 'permiso-de-prueba' as Permission;

afterEach(() => {
  jest.clearAllMocks();
});

// mapearResultado no está exportado — se prueba a través del hook público,
// que es como lo usan de verdad CrearPuntoScreen y PerfilScreen.
describe('usePermiso — verificar() mapea los 4 estados', () => {
  it.each([
    [RESULTS.GRANTED, 'concedido'],
    [RESULTS.LIMITED, 'concedido'],
    [RESULTS.BLOCKED, 'denegado_permanente'],
    [RESULTS.UNAVAILABLE, 'no_disponible'],
    [RESULTS.DENIED, 'denegado'],
  ])('check() → %s se traduce a %s', async (resultadoNativo, estadoEsperado) => {
    checkMock.mockResolvedValueOnce(resultadoNativo);

    const { result } = await renderHook(() => usePermiso(PERMISO_DE_PRUEBA));

    let estado: string | undefined;
    await act(async () => {
      estado = await result.current.verificar();
    });

    expect(estado).toBe(estadoEsperado);
  });
});

describe('usePermiso — solicitarConExplicacion()', () => {
  it('si el usuario rechaza la explicación, no llega a pedir el permiso nativo', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensaje, botones: any) => {
      // Simula que el usuario toca "Cancelar" (el primer botón, per rationale.ts).
      botones?.[0]?.onPress?.();
    });

    const { result } = await renderHook(() => usePermiso(PERMISO_DE_PRUEBA));

    let estado: string | undefined;
    await act(async () => {
      estado = await result.current.solicitarConExplicacion('Título', 'Mensaje');
    });

    expect(estado).toBe('denegado');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('si el usuario acepta la explicación, pide el permiso nativo y mapea el resultado', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensaje, botones: any) => {
      // El segundo botón es "Continuar" (ver rationale.ts).
      botones?.[1]?.onPress?.();
    });
    requestMock.mockResolvedValueOnce(RESULTS.GRANTED);

    const { result } = await renderHook(() => usePermiso(PERMISO_DE_PRUEBA));

    let estado: string | undefined;
    await act(async () => {
      estado = await result.current.solicitarConExplicacion('Título', 'Mensaje');
    });

    expect(requestMock).toHaveBeenCalledWith(PERMISO_DE_PRUEBA);
    expect(estado).toBe('concedido');
  });
});

describe('usePermiso — abrirAjustes()', () => {
  it('delega en openSettings() de react-native-permissions', async () => {
    const { result } = await renderHook(() => usePermiso(PERMISO_DE_PRUEBA));

    await act(async () => {
      await result.current.abrirAjustes();
    });

    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });
});
