import { apiFetch, parseJsonOrThrow } from './client';

export interface PuntoInteresApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  categoria?: { nombre: string } | null;
  updatedAt?: string;
}

export async function obtenerPuntos(): Promise<PuntoInteresApi[]> {
  const response = await apiFetch('/puntos-rapido');
  return parseJsonOrThrow<PuntoInteresApi[]>(response);
}

// DetallePuntoScreen usa esto para reconstruirse solo a partir del :id de la ruta.
export async function obtenerPuntoPorId(id: string): Promise<PuntoInteresApi> {
  const response = await apiFetch(`/puntos-interes/${id}`);
  return parseJsonOrThrow<PuntoInteresApi>(response);
}

export interface CrearPuntoPayload {
  nombre: string;
  descripcion?: string;
  categoriaId: number;
}

export async function crearPunto(payload: CrearPuntoPayload, idempotencyKey: string): Promise<PuntoInteresApi> {
  const response = await apiFetch('/puntos-interes', {
    method: 'POST',
    auth: true,
    idempotencyKey,
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<PuntoInteresApi>(response);
}
