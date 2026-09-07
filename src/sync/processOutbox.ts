import * as outboxRepo from '../storage/sqlite/outboxRepository';
import * as puntosRepo from '../storage/sqlite/puntosRepository';
import { crearPunto, CrearPuntoPayload } from '../api/puntos';

// Esta es la pieza que integra el repositorio con la base de datos local y la
// cola de salida (outbox) de la Semana 12: recorre la cola y reintenta cada
// operación pendiente cuyo backoff ya venció. Como se explica en
// api/errors.ts, solo existe esta cola de reintentos automáticos, y solo
// para la creación de puntos de interés — es segura porque cada intento
// viaja con el mismo Idempotency-Key.
export async function procesarOutbox(): Promise<void> {
  const pendientes = await outboxRepo.listarPendientes();
  const ahora = Date.now();

  for (const item of pendientes) {
    if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > ahora) {
      continue; // todavía dentro de la ventana de espera creciente
    }

    await outboxRepo.marcarEnviando(item.id);

    try {
      if (item.entity === 'punto_interes' && item.operation === 'create') {
        const payload = JSON.parse(item.payload) as CrearPuntoPayload;
        const puntoCreado = await crearPunto(payload, item.id);
        await puntosRepo.confirmarPuntoCreado(item.targetLocalId, puntoCreado);
      }
      await outboxRepo.marcarCompletada(item.id);
    } catch {
      await outboxRepo.registrarFallo(item.id, item.retryCount);
    }
  }
}
