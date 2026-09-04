import { getDb } from './db';

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute('SELECT value FROM schema_meta WHERE key = ?', [key]);
  return result.rows.length > 0 ? (result.rows[0].value as string) : null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO schema_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function getUltimaSincronizacion(): Promise<string | null> {
  return getMeta('puntos_last_sync_at');
}

// Se marca con el updatedAt MÁS RECIENTE que haya devuelto el servidor en la
// última sincronización — nunca con el reloj del dispositivo.
export async function marcarSincronizado(timestampServidor: string): Promise<void> {
  await setMeta('puntos_last_sync_at', timestampServidor);
}

export function estaCacheVencida(ultimaSync: string | null): boolean {
  if (!ultimaSync) {
    return true;
  }
  return Date.now() - new Date(ultimaSync).getTime() > CACHE_TTL_MS;
}
