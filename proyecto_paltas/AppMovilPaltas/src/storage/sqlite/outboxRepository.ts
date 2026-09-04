import { getDb } from './db';

export type OutboxStatus = 'pending' | 'sending' | 'failed' | 'done';

export interface OutboxItem {
  id: string;
  entity: string;
  operation: string;
  payload: string;
  targetLocalId: string;
  createdAt: string;
  status: OutboxStatus;
  retryCount: number;
  nextRetryAt: string | null;
}

function mapRow(row: Record<string, unknown>): OutboxItem {
  return {
    id: String(row.id),
    entity: String(row.entity),
    operation: String(row.operation),
    payload: String(row.payload),
    targetLocalId: String(row.target_local_id),
    createdAt: String(row.created_at),
    status: row.status as OutboxStatus,
    retryCount: Number(row.retry_count),
    nextRetryAt: row.next_retry_at != null ? String(row.next_retry_at) : null,
  };
}

// El id de la operación (uuid generado en el cliente) es también la Idempotency-Key
// enviada al backend: un reenvío tras un fallo de red no crea filas duplicadas.
export async function encolarOperacion(item: {
  id: string;
  entity: string;
  operation: string;
  payload: unknown;
  targetLocalId: string;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO outbox (id, entity, operation, payload, target_local_id, created_at, status, retry_count, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL)`,
    [item.id, item.entity, item.operation, JSON.stringify(item.payload), item.targetLocalId, new Date().toISOString()]
  );
}

export async function listarPendientes(): Promise<OutboxItem[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM outbox WHERE status IN ('pending', 'failed') ORDER BY created_at ASC"
  );
  return result.rows.map(mapRow);
}

export async function contarPendientes(): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT COUNT(*) as total FROM outbox WHERE status IN ('pending', 'sending', 'failed')"
  );
  return Number(result.rows[0].total);
}

export async function marcarEnviando(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE outbox SET status = 'sending' WHERE id = ?", [id]);
}

export async function marcarCompletada(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM outbox WHERE id = ?', [id]);
}

const REINTENTOS_MAXIMOS = 6;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

// Backoff exponencial (2s, 4s, 8s, ... tope 5min) con máximo de reintentos;
// agotados los intentos, la fila queda en 'failed' para reintento manual.
export async function registrarFallo(id: string, retryCountActual: number): Promise<'reintentara' | 'agotado'> {
  const db = await getDb();
  const nuevoRetryCount = retryCountActual + 1;

  if (nuevoRetryCount >= REINTENTOS_MAXIMOS) {
    await db.execute("UPDATE outbox SET status = 'failed', retry_count = ? WHERE id = ?", [nuevoRetryCount, id]);
    return 'agotado';
  }

  const demora = Math.min(BACKOFF_BASE_MS * 2 ** retryCountActual, BACKOFF_MAX_MS);
  const proximoIntento = new Date(Date.now() + demora).toISOString();
  await db.execute(
    "UPDATE outbox SET status = 'pending', retry_count = ?, next_retry_at = ? WHERE id = ?",
    [nuevoRetryCount, proximoIntento, id]
  );
  return 'reintentara';
}

export async function reintentarManualmente(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE outbox SET status = 'pending', next_retry_at = NULL WHERE id = ?", [id]);
}
