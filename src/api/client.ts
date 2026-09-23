import { API_BASE_URL, TIMEOUT_MS } from '../config/api';
import { getSession, notifyAccessTokenRefreshed } from './authSession';
import { logger } from '../utils/logger';

// Cliente HTTP: usamos el fetch nativo de React Native (no axios ni otra
// librería) envuelto en UNA sola función, apiFetch. Justificación: React
// Native ya trae fetch incorporado (cero dependencias nuevas) y esta única
// función ya cubre todo lo que necesita el proyecto — dirección base fija,
// cabeceras compartidas, inyección de token, renovación automática y tiempo
// de espera — sin la complejidad extra de una librería completa de HTTP.
//
// Orden de los interceptores dentro de apiFetch (en el orden en que corren):
//   1. AUTENTICACIÓN — construirHeaders() agrega el header Authorization.
//   2. REGISTRO — registrarPeticion()/registrarRespuesta() imprimen el
//      tráfico HTTP en la consola de Metro, SOLO en desarrollo, y ocultando
//      el valor real del header Authorization.
//   3. RENOVACIÓN — si la respuesta es 401, refresca el token y reintenta la
//      petición UNA sola vez (ver la marca yaReintentada más abajo).
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Error HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean; // adjunta el access token si está disponible
  idempotencyKey?: string;
}

// Envuelve fetch con un tiempo de espera explícito: si el servidor no
// responde en TIMEOUT_MS, se cancela la petición (en vez de dejarla colgada
// para siempre) y fetch lanza un error con name === 'AbortError', que
// api/errors.ts traduce a "tiempo de espera agotado".
async function fetchConTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// INTERCEPTOR DE REGISTRO: imprime cada petición y respuesta en la consola de
// Metro, para poder ver el tráfico HTTP mientras se depura. Dos reglas de
// seguridad, no negociables:
//   - Solo corre si __DEV__ es true — logger.debug() ya se encarga de eso.
//   - NUNCA imprime el valor real del header Authorization (ahí viaja el
//     access token): logger.debug() pasa el contexto por sanitizarContexto(),
//     que oculta cualquier clave llamada "Authorization" automáticamente.
function registrarPeticion(method: string, path: string, headers: HeadersInit_): void {
  logger.debug(`[HTTP] → ${method} ${path}`, headers as Record<string, string>);
}

function registrarRespuesta(method: string, path: string, status: number): void {
  logger.debug(`[HTTP] ← ${status} ${method} ${path}`);
}

// INTERCEPTOR DE RENOVACIÓN (mitad 1 de 2, ver apiFetch más abajo): pide un
// access token nuevo usando el refresh token guardado. Si el refresh token
// también es inválido o expiró, el backend responde distinto de 200 y esta
// función devuelve null — el llamador entonces se queda con el 401 original.
async function refrescarAccessToken(): Promise<string | null> {
  const { refreshToken } = getSession();
  if (!refreshToken) {
    return null;
  }

  const response = await fetchConTimeout(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  notifyAccessTokenRefreshed(data.accessToken);
  return data.accessToken as string;
}

// INTERCEPTOR DE AUTENTICACIÓN: agrega el header Authorization con el access
// token. El token en sí NUNCA se lee de disco aquí — viene de authSession.ts,
// un espejo en memoria que AuthContext mantiene sincronizado con el
// almacenamiento cifrado (Keychain, storage/secure/tokenStorage.ts) al
// arrancar la app, iniciar sesión y renovar el token. Leer memoria en cada
// request es más rápido que golpear Keychain en cada petición.
function construirHeaders(
  auth: boolean,
  accessToken: string | null,
  idempotencyKey: string | undefined,
  extra: HeadersInit_ | undefined,
  esFormData: boolean
): HeadersInit_ {
  return {
    // Con FormData, fetch/RN arma el boundary multipart solo — forzar
    // "application/json" aquí rompería la subida de archivos.
    ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(extra || {}),
    ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
}

// Punto de entrada único del cliente HTTP. Adjunta el access token en rutas
// protegidas (interceptor de autenticación), registra el tráfico en
// desarrollo (interceptor de registro) y, ante un 401, renueva el token y
// reintenta la petición (interceptor de renovación).
//
// Protección contra bucles: yaReintentada es un parámetro interno (no forma
// parte de RequestOptions, así que ninguna pantalla lo pasa por error) que
// arranca en false y se marca en true antes de reenviar la petición. Si esa
// segunda petición TAMBIÉN devuelve 401 (por ejemplo porque el refresh token
// también expiró), la condición de abajo ya no se cumple y la respuesta se
// devuelve tal cual — nunca puede quedar reintentando infinitamente.
//
// Un 403 se deja pasar tal cual — no es un problema de sesión (el token es
// válido), es una cuestión de permisos que decide la pantalla que llama.
export async function apiFetch(
  path: string,
  options: RequestOptions = {},
  yaReintentada = false
): Promise<Response> {
  const { auth = false, idempotencyKey, headers, ...rest } = options;
  const esFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const method = rest.method ?? 'GET';

  const { accessToken } = getSession();
  const headersFinal = construirHeaders(auth, accessToken, idempotencyKey, headers, esFormData);

  registrarPeticion(method, path, headersFinal);
  const response = await fetchConTimeout(`${API_BASE_URL}${path}`, { ...rest, headers: headersFinal });
  registrarRespuesta(method, path, response.status);

  if (auth && response.status === 401 && !yaReintentada) {
    const nuevoAccessToken = await refrescarAccessToken();
    if (nuevoAccessToken) {
      // Se marca yaReintentada = true: esta es la ÚNICA vez que se permite
      // reintentar — ver nota de "protección contra bucles" arriba.
      return apiFetch(path, options, true);
    }
  }

  return response;
}

export async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}
