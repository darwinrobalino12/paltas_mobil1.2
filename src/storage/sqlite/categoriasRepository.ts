import { getDb } from './db';
import { obtenerCategorias } from '../../api/categorias';

export interface CategoriaLocal {
  id: number;
  nombre: string;
}

export async function listarCategoriasLocales(): Promise<CategoriaLocal[]> {
  const db = await getDb();
  const result = await db.execute('SELECT id, nombre FROM categorias ORDER BY nombre ASC');
  return result.rows.map(row => ({ id: Number(row.id), nombre: String(row.nombre) }));
}

// Minimización: de Categoria solo se cachea id/nombre, que es lo único que usa el picker.
export async function sincronizarCategorias(): Promise<CategoriaLocal[]> {
  try {
    const remotas = await obtenerCategorias();
    const db = await getDb();
    const ahora = new Date().toISOString();
    await db.transaction(async tx => {
      for (const categoria of remotas) {
        await tx.execute(
          `INSERT INTO categorias (id, nombre, local_updated_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, local_updated_at = excluded.local_updated_at`,
          [categoria.id, categoria.nombre, ahora]
        );
      }
    });
  } catch {
    // Sin red: se sirve lo que ya haya en caché para poblar el picker offline.
  }
  return listarCategoriasLocales();
}
