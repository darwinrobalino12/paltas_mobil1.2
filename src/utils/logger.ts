// Logger estructurado con niveles, para reemplazar los console.log sueltos.
// Dos reglas, igual de estrictas que las que ya tenía api/client.ts:
//   - debug/info solo imprimen en desarrollo (__DEV__). warn/error se
//     imprimen siempre, porque en producción son la única señal de que algo
//     salió mal (junto con Sentry, ver src/config/monitoring.ts).
//   - NUNCA se imprime un token, contraseña ni dato personal: cualquier
//     contexto pasado a estas funciones pasa primero por sanitizarContexto.
export type Nivel = 'debug' | 'info' | 'warn' | 'error';

// Coincide con el nombre de la clave, no con el valor — así no hace falta
// saber de antemano qué campos existen en cada llamada, alcanza con nombrar
// bien las claves del contexto que se loguea.
const PATRON_CLAVE_SENSIBLE = /authorization|token|password|contrase|email|correo|dni|cedula/i;

export function sanitizarContexto(
  contexto?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!contexto) {
    return undefined;
  }
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(contexto)) {
    limpio[clave] = PATRON_CLAVE_SENSIBLE.test(clave) ? '[OCULTO]' : valor;
  }
  return limpio;
}

function registrar(nivel: Nivel, mensaje: string, contexto?: Record<string, unknown>): void {
  if ((nivel === 'debug' || nivel === 'info') && !__DEV__) {
    return;
  }
  const contextoSeguro = sanitizarContexto(contexto);
  const linea = `[${nivel}] ${mensaje}`;
  switch (nivel) {
    case 'debug':
      console.log(linea, contextoSeguro ?? '');
      break;
    case 'info':
      console.info(linea, contextoSeguro ?? '');
      break;
    case 'warn':
      console.warn(linea, contextoSeguro ?? '');
      break;
    case 'error':
      console.error(linea, contextoSeguro ?? '');
      break;
  }
}

export const logger = {
  debug: (mensaje: string, contexto?: Record<string, unknown>) => registrar('debug', mensaje, contexto),
  info: (mensaje: string, contexto?: Record<string, unknown>) => registrar('info', mensaje, contexto),
  warn: (mensaje: string, contexto?: Record<string, unknown>) => registrar('warn', mensaje, contexto),
  error: (mensaje: string, contexto?: Record<string, unknown>) => registrar('error', mensaje, contexto),
};
