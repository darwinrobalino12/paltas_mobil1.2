import { apiFetch, parseJsonOrThrow } from './client';

export interface PuntoInteresApi {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  categoria?: { nombre: string } | null;
  latitud?: number | null;
  longitud?: number | null;
  imagenUrl?: string | null;
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
  latitud?: number;
  longitud?: number;
}

// Sin foto: JSON normal, funciona online y es lo que viaja por la cola offline.
export async function crearPunto(payload: CrearPuntoPayload, idempotencyKey: string): Promise<PuntoInteresApi> {
  const response = await apiFetch('/puntos-interes', {
    method: 'POST',
    auth: true,
    idempotencyKey,
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<PuntoInteresApi>(response);
}

// Con foto: multipart/form-data. Siempre requiere conexión (no pasa por el outbox).
export async function crearPuntoConFoto(
  payload: CrearPuntoPayload,
  fotoUri: string,
  idempotencyKey: string
): Promise<PuntoInteresApi> {
  const formData = new FormData();
  formData.append('nombre', payload.nombre);
  if (payload.descripcion) {
    formData.append('descripcion', payload.descripcion);
  }
  formData.append('categoriaId', String(payload.categoriaId));
  if (payload.latitud !== undefined) {
    formData.append('latitud', String(payload.latitud));
  }
  if (payload.longitud !== undefined) {
    formData.append('longitud', String(payload.longitud));
  }
  formData.append('imagen', {
    uri: fotoUri,
    name: 'foto.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await apiFetch('/puntos-interes', {
    method: 'POST',
    auth: true,
    idempotencyKey,
    body: formData,
  });
  return parseJsonOrThrow<PuntoInteresApi>(response);
}
