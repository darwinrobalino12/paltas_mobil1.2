import type { Transaction } from '@op-engineering/op-sqlite';
import { getDb } from './db';
import { getUltimaSincronizacion, marcarSincronizado, estaCacheVencida } from './schemaMeta';
import { obtenerPuntos, PuntoInteresApi } from '../../api/puntos';

export interface PuntoLocal {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  serverUpdatedAt: string | null;
  pendingSync: boolean;
  latitud: number | null;
  longitud: number | null;
  imagenUrl: string | null;
}

function mapRow(row: Record<string, unknown>): PuntoLocal {
  return {
    id: String(row.id),
    nombre: String(row.nombre),
    descripcion: row.descripcion != null ? String(row.descripcion) : null,
    categoriaId: row.categoria_id != null ? Number(row.categoria_id) : null,
    categoriaNombre: row.categoria_nombre != null ? String(row.categoria_nombre) : null,
    serverUpdatedAt: row.server_updated_at != null ? String(row.server_updated_at) : null,
    pendingSync: Number(row.pending_sync) === 1,
    latitud: row.latitud != null ? Number(row.latitud) : null,
    longitud: row.longitud != null ? Number(row.longitud) : null,
    imagenUrl: row.imagen_url != null ? String(row.imagen_url) : null,
  };
}

export async function listarPuntosLocales(): Promise<PuntoLocal[]> {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM puntos_interes WHERE deleted_locally = 0 ORDER BY nombre ASC');
  return result.rows.map(mapRow);
}

export async function obtenerPuntoLocalPorId(id: string): Promise<PuntoLocal | null> {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM puntos_interes WHERE id = ?', [id]);
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

async function guardarPuntoEnTx(tx: Transaction, punto: PuntoInteresApi, ahora: string): Promise<void> {
  await tx.execute(
    `INSERT INTO puntos_interes
      (id, nombre, descripcion, categoria_id, categoria_nombre, server_updated_at, local_updated_at, pending_sync, deleted_locally, latitud, longitud, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       nombre = excluded.nombre,
       descripcion = excluded.descripcion,
       categoria_id = excluded.categoria_id,
       categoria_nombre = excluded.categoria_nombre,
       server_updated_at = excluded.server_updated_at,
       local_updated_at = excluded.local_updated_at,
       pending_sync = 0,
       latitud = excluded.latitud,
       longitud = excluded.longitud,
       imagen_url = excluded.imagen_url`,
    [
      String(punto.id),
      punto.nombre,
      punto.descripcion,
      punto.categoriaId,
      punto.categoria?.nombre ?? null,
      punto.updatedAt ?? null,
      ahora,
      punto.latitud ?? null,
      punto.longitud ?? null,
      punto.imagenUrl ?? null,
    ]
  );
}

async function guardarPuntosEnCache(puntos: PuntoInteresApi[]): Promise<void> {
  const db = await getDb();
  const ahora = new Date().toISOString();
  await db.transaction(async tx => {
    for (const punto of puntos) {
      await guardarPuntoEnTx(tx, punto, ahora);
    }
  });

  // La marca de sincronización viene del updatedAt más reciente del SERVIDOR, no del dispositivo.
  const masReciente = puntos.reduce<string | null>((max, p) => {
    if (!p.updatedAt) return max;
    return !max || p.updatedAt > max ? p.updatedAt : max;
  }, null);
  if (masReciente) {
    await marcarSincronizado(masReciente);
  }
}

export interface SincronizarPuntosResultado {
  puntos: PuntoLocal[];
  cacheVencida: boolean;
  ultimaSincronizacion: string | null;
}

// Cache-first: si la caché no está vencida, se responde solo con lo local (sin red).
// Si está vencida (o se fuerza), se intenta refrescar; si falla, se degrada a lo
// que ya había en caché — la pantalla nunca queda vacía.
export async function sincronizarPuntos(forzar = false): Promise<SincronizarPuntosResultado> {
  const ultimaSincronizacion = await getUltimaSincronizacion();
  const cacheVencida = estaCacheVencida(ultimaSincronizacion);

  if (!forzar && !cacheVencida) {
    return { puntos: await listarPuntosLocales(), cacheVencida: false, ultimaSincronizacion };
  }

  try {
    const puntosRemotos = await obtenerPuntos();
    await guardarPuntosEnCache(puntosRemotos);
    return {
      puntos: await listarPuntosLocales(),
      cacheVencida: false,
      ultimaSincronizacion: await getUltimaSincronizacion(),
    };
  } catch {
    return { puntos: await listarPuntosLocales(), cacheVencida: true, ultimaSincronizacion };
  }
}

export async function insertarPuntoPendiente(punto: {
  localId: string;
  nombre: string;
  descripcion?: string;
  categoriaId: number;
  categoriaNombre: string;
  latitud?: number;
  longitud?: number;
}): Promise<void> {
  const db = await getDb();
  const ahora = new Date().toISOString();
  await db.execute(
    `INSERT INTO puntos_interes
      (id, nombre, descripcion, categoria_id, categoria_nombre, server_updated_at, local_updated_at, pending_sync, deleted_locally, latitud, longitud, imagen_url)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 0, ?, ?, NULL)`,
    [
      punto.localId,
      punto.nombre,
      punto.descripcion ?? null,
      punto.categoriaId,
      punto.categoriaNombre,
      ahora,
      punto.latitud ?? null,
      punto.longitud ?? null,
    ]
  );
}

// Cuando el outbox confirma la creación contra el servidor, el registro optimista
// (id local) se reemplaza por el registro real con id e updatedAt del servidor.
export async function confirmarPuntoCreado(localId: string, puntoServidor: PuntoInteresApi): Promise<void> {
  const db = await getDb();
  const ahora = new Date().toISOString();
  await db.transaction(async tx => {
    await tx.execute('DELETE FROM puntos_interes WHERE id = ?', [localId]);
    await guardarPuntoEnTx(tx, puntoServidor, ahora);
  });
}
