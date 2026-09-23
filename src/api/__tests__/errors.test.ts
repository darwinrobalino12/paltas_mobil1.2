import { traducirError } from '../errors';
import { ApiError } from '../client';

// traducirError es la pieza de lógica que decide qué mensaje ve el usuario
// según de dónde vino el fallo — las 4 familias descritas en el propio
// comentario del archivo fuente, más el caso "otro 4xx" y el fallback.
describe('traducirError', () => {
  it('familia 1: sin conexión (TypeError de fetch)', () => {
    expect(traducirError(new TypeError('Network request failed'))).toBe(
      'No hay conexión con el servidor. Verifica tu internet e intenta de nuevo.'
    );
  });

  it('familia 2: tiempo de espera agotado (AbortError)', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    expect(traducirError(error)).toBe('El servidor tardó demasiado en responder. Intenta de nuevo.');
  });

  it('familia 3: error de servidor (5xx)', () => {
    expect(traducirError(new ApiError(500, {}))).toBe(
      'El servidor tuvo un problema. Intenta de nuevo más tarde.'
    );
    expect(traducirError(new ApiError(503, {}))).toBe(
      'El servidor tuvo un problema. Intenta de nuevo más tarde.'
    );
  });

  it('familia 4: sesión expirada (401)', () => {
    expect(traducirError(new ApiError(401, {}))).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
  });

  it('familia 4: sin permiso (403)', () => {
    expect(traducirError(new ApiError(403, {}))).toBe('No tienes permiso para realizar esta acción.');
  });

  it('familia 4: no encontrado (404)', () => {
    expect(traducirError(new ApiError(404, {}))).toBe('No se encontró lo que buscabas.');
  });

  it('familia 4: otro 4xx usa el mensaje genérico de datos inválidos', () => {
    expect(traducirError(new ApiError(418, {}))).toBe('Los datos enviados no son válidos.');
  });

  it('fallback: cualquier otra cosa usa el mensaje genérico', () => {
    expect(traducirError('boom')).toBe('Ocurrió un error inesperado. Intenta de nuevo.');
    expect(traducirError(undefined)).toBe('Ocurrió un error inesperado. Intenta de nuevo.');
  });
});
