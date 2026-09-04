import { API_BASE_URL } from '../config/api';
import { getSession, notifyAccessTokenRefreshed } from './authSession';

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

async function refrescarAccessToken(): Promise<string | null> {
  const { refreshToken } = getSession();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/refresh`, {
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

function construirHeaders(
  auth: boolean,
  accessToken: string | null,
  idempotencyKey: string | undefined,
  extra: HeadersInit_ | undefined
): HeadersInit_ {
  return {
    'Content-Type': 'application/json',
    ...(extra || {}),
    ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
}

// Wrapper de fetch: adjunta el access token en rutas protegidas y, ante un 401,
// intenta refrescar la sesión UNA vez antes de rendirse. Un 403 se deja pasar
// tal cual — no es un problema de sesión, lo decide la pantalla que llama.
export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const { auth = false, idempotencyKey, headers, ...rest } = options;

  const { accessToken } = getSession();
  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: construirHeaders(auth, accessToken, idempotencyKey, headers),
  });

  if (auth && response.status === 401) {
    const nuevoAccessToken = await refrescarAccessToken();
    if (nuevoAccessToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: construirHeaders(auth, nuevoAccessToken, idempotencyKey, headers),
      });
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
