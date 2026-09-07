import { apiFetch, parseJsonOrThrow } from './client';
import { usuarioDesdeJson } from '../storage/secure/tokenStorage';
import type { UsuarioAutenticado } from '../storage/secure/tokenStorage';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioAutenticado;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const json = await parseJsonOrThrow<any>(response);
  return {
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    usuario: usuarioDesdeJson(json.usuario),
  };
}

export async function logout(usuarioId: number): Promise<void> {
  // Best-effort: si el backend no responde, el cierre de sesión local no debe bloquearse.
  await apiFetch('/logout', {
    method: 'POST',
    body: JSON.stringify({ usuarioId }),
  }).catch(() => undefined);
}
