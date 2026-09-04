// Espejo en memoria de la sesión (accessToken/refreshToken) para que el cliente
// HTTP (fuera del árbol de React) pueda leerla sin volver a golpear Keychain
// en cada request. AuthContext es quien la actualiza.
interface SessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
}

let session: SessionSnapshot = { accessToken: null, refreshToken: null };
let onAccessTokenRefreshed: ((accessToken: string) => void) | null = null;

export function setSession(next: SessionSnapshot): void {
  session = next;
}

export function getSession(): SessionSnapshot {
  return session;
}

export function setOnAccessTokenRefreshed(cb: ((accessToken: string) => void) | null): void {
  onAccessTokenRefreshed = cb;
}

export function notifyAccessTokenRefreshed(accessToken: string): void {
  session = { ...session, accessToken };
  onAccessTokenRefreshed?.(accessToken);
}
