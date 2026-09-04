import { apiFetch, parseJsonOrThrow } from './client';

export interface CategoriaApi {
  id: number;
  nombre: string;
}

export async function obtenerCategorias(): Promise<CategoriaApi[]> {
  const response = await apiFetch('/categorias');
  return parseJsonOrThrow<CategoriaApi[]>(response);
}
