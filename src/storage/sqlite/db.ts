import { open, DB } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';

let dbInstance: DB | null = null;
let readyPromise: Promise<DB> | null = null;

async function ejecutarMigraciones(db: DB): Promise<void> {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT)');

  const result = await db.execute('SELECT value FROM schema_meta WHERE key = ?', ['schema_version']);
  const versionActual = result.rows.length > 0 ? Number(result.rows[0].value) : 0;

  const pendientes = MIGRATIONS.filter(m => m.version > versionActual).sort((a, b) => a.version - b.version);

  for (const migracion of pendientes) {
    await db.transaction(async tx => {
      for (const sql of migracion.up) {
        await tx.execute(sql);
      }
    });
    await db.execute(
      `INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(migracion.version)]
    );
  }
}

export async function getDb(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!readyPromise) {
    const db = open({ name: 'paltas.db' });
    readyPromise = ejecutarMigraciones(db).then(() => {
      dbInstance = db;
      return db;
    });
  }
  return readyPromise;
}

// Limpieza COMPLETA al cerrar sesión: no solo el token (eso vive en Keychain y se
// borra aparte en tokenStorage), sino todo el catálogo y la cola de salida cacheados.
export async function wipeLocalDatabase(): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    await tx.execute('DELETE FROM puntos_interes');
    await tx.execute('DELETE FROM categorias');
    await tx.execute('DELETE FROM outbox');
    await tx.execute("DELETE FROM schema_meta WHERE key = 'puntos_last_sync_at'");
  });
}
