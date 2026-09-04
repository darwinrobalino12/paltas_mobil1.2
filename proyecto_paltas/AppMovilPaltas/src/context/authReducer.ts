import type { UsuarioAutenticado } from '../storage/secure/tokenStorage';

export interface DestinoPendiente {
  name: string;
  params?: Record<string, unknown>;
}

export interface AuthState {
  status: 'bootstrapping' | 'unauthenticated' | 'authenticated';
  usuario: UsuarioAutenticado | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingRedirect: DestinoPendiente | null;
}

export type AuthAction =
  | { type: 'BOOTSTRAP_SIN_SESION' }
  | {
      type: 'SESION_INICIADA';
      usuario: UsuarioAutenticado;
      accessToken: string;
      refreshToken: string;
    }
  | { type: 'ACCESS_TOKEN_ACTUALIZADO'; accessToken: string }
  | { type: 'SESION_CERRADA' }
  | { type: 'GUARDAR_DESTINO_PENDIENTE'; destino: DestinoPendiente }
  | { type: 'LIMPIAR_DESTINO_PENDIENTE' };

export const authInitialState: AuthState = {
  status: 'bootstrapping',
  usuario: null,
  accessToken: null,
  refreshToken: null,
  pendingRedirect: null,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'BOOTSTRAP_SIN_SESION':
      return { ...authInitialState, status: 'unauthenticated' };
    case 'SESION_INICIADA':
      return {
        ...state,
        status: 'authenticated',
        usuario: action.usuario,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
      };
    case 'ACCESS_TOKEN_ACTUALIZADO':
      return { ...state, accessToken: action.accessToken };
    case 'SESION_CERRADA':
      return { ...authInitialState, status: 'unauthenticated' };
    case 'GUARDAR_DESTINO_PENDIENTE':
      return { ...state, pendingRedirect: action.destino };
    case 'LIMPIAR_DESTINO_PENDIENTE':
      return { ...state, pendingRedirect: null };
    default:
      return state;
  }
}
