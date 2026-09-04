export interface Migration {
  version: number;
  up: string[];
}

// Array numerado: cada migración futura solo agrega (CREATE TABLE IF NOT EXISTS /
// ALTER TABLE ADD COLUMN), nunca DROP, para no destruir datos ya sincronizados.
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        local_updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS puntos_interes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        categoria_id INTEGER,
        categoria_nombre TEXT,
        server_updated_at TEXT,
        local_updated_at TEXT NOT NULL,
        pending_sync INTEGER NOT NULL DEFAULT 0,
        deleted_locally INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        target_local_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at TEXT
      )`,
    ],
  },
];
