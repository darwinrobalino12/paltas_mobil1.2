import { estaCacheVencida, CACHE_TTL_MS } from '../schemaMeta';

// estaCacheVencida es pura (no toca la base real) y decide si PuntosScreen
// vuelve a pedirle datos al backend o se queda con lo cacheado — se prueba
// con reloj falso para que el resultado no dependa de la hora real.
describe('estaCacheVencida', () => {
  const AHORA = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AHORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sin ninguna sincronización previa, la caché se considera vencida', () => {
    expect(estaCacheVencida(null)).toBe(true);
  });

  it('dentro de la ventana de TTL, la caché NO está vencida', () => {
    const dentroDelTtl = new Date(AHORA.getTime() - (CACHE_TTL_MS - 1000)).toISOString();
    expect(estaCacheVencida(dentroDelTtl)).toBe(false);
  });

  it('justo al pasar el TTL, la caché queda vencida', () => {
    const pasadoElTtl = new Date(AHORA.getTime() - (CACHE_TTL_MS + 1000)).toISOString();
    expect(estaCacheVencida(pasadoElTtl)).toBe(true);
  });
});
