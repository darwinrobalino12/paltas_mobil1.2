import { ApiError } from './client';

// Traduce cualquier error que pueda salir de una llamada a apiFetch en un
// mensaje de dominio (texto en español, listo para mostrar en pantalla).
// Existen 4 familias de fallo posibles, y cada una tiene una causa distinta:
export function traducirError(error: unknown): string {
  // Familia 1: SIN CONEXIÓN. fetch lanza un TypeError cuando no hay red o el
  // servidor no se puede alcanzar (por ejemplo, el backend está apagado).
  if (error instanceof TypeError) {
    return 'No hay conexión con el servidor. Verifica tu internet e intenta de nuevo.';
  }

  // Familia 2: TIEMPO DE ESPERA AGOTADO. fetchConTimeout (api/client.ts)
  // cancela la petición pasado TIMEOUT_MS; eso hace que fetch rechace con un
  // error cuyo nombre es 'AbortError'.
  if (error instanceof Error && error.name === 'AbortError') {
    return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
  }

  // Familias 3 y 4: la petición SÍ llegó al servidor, pero la respuesta no
  // fue exitosa. ApiError (lanzado por parseJsonOrThrow) guarda el status.
  if (error instanceof ApiError) {
    // Familia 3: ERROR DEL SERVIDOR (5xx) — el problema es del backend, no
    // de lo que el usuario envió.
    if (error.status >= 500) {
      return 'El servidor tuvo un problema. Intenta de nuevo más tarde.';
    }

    // Familia 4: ERROR DEL CLIENTE / DATOS INVÁLIDOS (4xx) — casos comunes
    // con mensaje específico, y uno genérico para el resto.
    if (error.status === 401) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para realizar esta acción.';
    }
    if (error.status === 404) {
      return 'No se encontró lo que buscabas.';
    }
    return 'Los datos enviados no son válidos.';
  }

  // Nada de lo anterior: un error inesperado que no vino de apiFetch.
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

// Nota sobre reintentos automáticos: el único lugar del proyecto donde se
// reintenta una petición automáticamente es el outbox de la Semana 12
// (storage/sqlite/outboxRepository.ts + sync/processOutbox.ts), y SOLO para
// la operación "crear punto de interés". Es seguro reintentarla las veces
// que haga falta porque viaja con un Idempotency-Key generado en el
// cliente: si el backend ya procesó esa clave, devuelve el mismo resultado
// en vez de crear un punto duplicado (ver routes/puntos.js, la caché
// `idem:${idempotencyKey}` en Redis). Ninguna otra operación de la app se
// reintenta sola — reintentar automáticamente una operación NO idempotente
// (por ejemplo, algo que sume un contador) podría duplicar el efecto.
