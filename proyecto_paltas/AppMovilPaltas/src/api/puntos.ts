import { apiFetch, parseJsonOrThrow } from './client';

// Modelo de "Punto de interés" tal como lo entiende la app. El backend
// (Sequelize, models/PuntoInteres.js) ya usa camelCase igual que TypeScript,
// así que hoy los nombres coinciden 1 a 1 — pero la función puntoDesdeJson()
// de abajo es el ÚNICO lugar por donde pasa la respuesta del servidor antes
// de convertirse en un PuntoInteresApi. Si algún día el backend cambia un
// nombre de campo, solo hay que tocar esa función, no cada pantalla.
//
// Divergencia de nombres que SÍ existe hoy (no aquí, sino entre este modelo
// y la caché local): la tabla SQLite en el dispositivo usa columnas
// snake_case (categoria_id, imagen_url...) por convención de la base local;
// esa traducción pasa por mapRow() en storage/sqlite/puntosRepository.ts.
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

// "Serialización": convierte el JSON crudo que manda el servidor en el tipo
// PuntoInteresApi de arriba. Aquí es donde se resolvería cualquier
// diferencia de nombre entre backend y app.
function puntoDesdeJson(json: any): PuntoInteresApi {
  return {
    id: json.id,
    nombre: json.nombre,
    descripcion: json.descripcion ?? null,
    categoriaId: json.categoriaId,
    categoria: json.categoria ?? null,
    latitud: json.latitud ?? null,
    longitud: json.longitud ?? null,
    imagenUrl: json.imagenUrl ?? null,
    updatedAt: json.updatedAt,
  };
}

export async function obtenerPuntos(): Promise<PuntoInteresApi[]> {
  const response = await apiFetch('/puntos-rapido');
  const json = await parseJsonOrThrow<any[]>(response);
  return json.map(puntoDesdeJson);
}

// DetallePuntoScreen usa esto para reconstruirse solo a partir del :id de la ruta.
export async function obtenerPuntoPorId(id: string): Promise<PuntoInteresApi> {
  const response = await apiFetch(`/puntos-interes/${id}`);
  const json = await parseJsonOrThrow<any>(response);
  return puntoDesdeJson(json);
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
  const json = await parseJsonOrThrow<any>(response);
  return puntoDesdeJson(json);
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
  const json = await parseJsonOrThrow<any>(response);
  return puntoDesdeJson(json);
}
