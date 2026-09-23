import { sanitizarContexto } from '../logger';

// Esta función es la garantía técnica del punto 19 del enunciado: ningún
// log (ni ningún breadcrumb de Sentry, que la reutiliza) puede llevar un
// token, contraseña o dato personal en texto plano.
describe('sanitizarContexto', () => {
  it('sin contexto, no hay nada que sanitizar', () => {
    expect(sanitizarContexto(undefined)).toBeUndefined();
  });

  it('tapa claves que huelen a credenciales o datos personales', () => {
    const resultado = sanitizarContexto({
      Authorization: 'Bearer abc123',
      accessToken: 'xyz',
      refreshToken: 'xyz',
      password: 'secreta',
      contraseña: 'secreta',
      email: 'persona@ejemplo.com',
      correoElectronico: 'persona@ejemplo.com',
      dni: '1234567890',
      cedula: '1234567890',
    });

    expect(resultado).toEqual({
      Authorization: '[OCULTO]',
      accessToken: '[OCULTO]',
      refreshToken: '[OCULTO]',
      password: '[OCULTO]',
      contraseña: '[OCULTO]',
      email: '[OCULTO]',
      correoElectronico: '[OCULTO]',
      dni: '[OCULTO]',
      cedula: '[OCULTO]',
    });
  });

  it('deja pasar claves normales sin tocar el valor', () => {
    expect(sanitizarContexto({ usuarioId: 42, path: '/puntos-interes' })).toEqual({
      usuarioId: 42,
      path: '/puntos-interes',
    });
  });
});
