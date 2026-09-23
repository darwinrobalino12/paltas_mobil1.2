import { apiFetch, parseJsonOrThrow } from '../client';
import { setSession, getSession } from '../authSession';
import { TIMEOUT_MS } from '../../config/api';

// Doble del transporte HTTP: no hay un parámetro de inyección en apiFetch
// (llama a fetch directo), así que se sustituye globalThis.fetch por test. Cada
// caso resetea la sesión en memoria para que las pruebas corran en cualquier
// orden sin depender de lo que dejó la anterior.
function respuestaFalsa(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
  } as unknown as Response;
}

describe('apiFetch — doble del cliente HTTP', () => {
  beforeEach(() => {
    setSession({ accessToken: null, refreshToken: null });
    jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('200: la respuesta exitosa se parsea tal cual', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(respuestaFalsa(200, { mensaje: 'ok' }));

    const response = await apiFetch('/saludo');
    const data = await parseJsonOrThrow<{ mensaje: string }>(response);

    expect(data).toEqual({ mensaje: 'ok' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('401 con refresh exitoso: reintenta UNA sola vez con el token nuevo', async () => {
    setSession({ accessToken: 'viejo', refreshToken: 'valido' });
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce(respuestaFalsa(401)) // 1) petición original
      .mockResolvedValueOnce(respuestaFalsa(200, { accessToken: 'nuevo' })) // 2) /refresh
      .mockResolvedValueOnce(respuestaFalsa(200, { ok: true })); // 3) reintento

    const response = await apiFetch('/puntos-interes', { auth: true });

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);

    const [, opcionesTercerLlamada] = (globalThis.fetch as jest.Mock).mock.calls[2];
    expect((opcionesTercerLlamada.headers as Record<string, string>).Authorization).toBe(
      'Bearer nuevo'
    );
    expect(getSession().accessToken).toBe('nuevo');
  });

  it('403 no dispara el refresh — no es un problema de sesión, es de permisos', async () => {
    setSession({ accessToken: 'algo', refreshToken: 'algo' });
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(respuestaFalsa(403));

    const response = await apiFetch('/algo-prohibido', { auth: true });

    expect(response.status).toBe(403);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('422: parseJsonOrThrow lanza ApiError con el body de errores por campo', async () => {
    const cuerpoError = { errors: [{ field: 'nombre', message: 'Ya existe un punto con ese nombre.' }] };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(respuestaFalsa(422, cuerpoError));

    const response = await apiFetch('/puntos-interes', { method: 'POST' });

    await expect(parseJsonOrThrow(response)).rejects.toMatchObject({
      status: 422,
      body: cuerpoError,
    });
  });

  it('tiempo de espera agotado: cancela la petición pasado TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    (globalThis.fetch as jest.Mock).mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const promesa = apiFetch('/algo-lento');
    // Hay que crear la aserción ANTES de avanzar el reloj falso y esperarla
    // recién después — eslint no puede ver que sí se hace `await` más abajo.
    // eslint-disable-next-line jest/valid-expect
    const expectativa = expect(promesa).rejects.toMatchObject({ name: 'AbortError' });
    jest.advanceTimersByTime(TIMEOUT_MS);
    await expectativa;
  });
});
