import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { authReducer, authInitialState, DestinoPendiente } from './authReducer';
import * as tokenStorage from '../storage/secure/tokenStorage';
import type { UsuarioAutenticado } from '../storage/secure/tokenStorage';
import { setSession, setOnAccessTokenRefreshed } from '../api/authSession';
import { login as loginApi, logout as logoutApi } from '../api/auth';
import { wipeLocalDatabase } from '../storage/sqlite/db';

interface AuthContextValue {
  status: 'bootstrapping' | 'unauthenticated' | 'authenticated';
  usuario: UsuarioAutenticado | null;
  pendingRedirect: DestinoPendiente | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  guardarDestinoPendiente: (destino: DestinoPendiente) => void;
  consumirDestinoPendiente: () => DestinoPendiente | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, authInitialState);

  useEffect(() => {
    setOnAccessTokenRefreshed(accessToken => {
      dispatch({ type: 'ACCESS_TOKEN_ACTUALIZADO', accessToken });
    });
    return () => setOnAccessTokenRefreshed(null);
  }, []);

  // Rehidrata la sesión desde Keychain al abrir la app (persistencia real de sesión).
  // Si Keychain falla (o no hay sesión), nunca debe dejar el status colgado en
  // 'bootstrapping' — RequireAuth solo redirige cuando status === 'unauthenticated'.
  useEffect(() => {
    (async () => {
      try {
        const sesion = await tokenStorage.leerSesion();
        if (sesion) {
          setSession({ accessToken: sesion.accessToken, refreshToken: sesion.refreshToken });
          dispatch({
            type: 'SESION_INICIADA',
            usuario: sesion.usuario,
            accessToken: sesion.accessToken,
            refreshToken: sesion.refreshToken,
          });
        } else {
          dispatch({ type: 'BOOTSTRAP_SIN_SESION' });
        }
      } catch {
        dispatch({ type: 'BOOTSTRAP_SIN_SESION' });
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const respuesta = await loginApi(username, password);
    setSession({ accessToken: respuesta.accessToken, refreshToken: respuesta.refreshToken });
    await tokenStorage.guardarSesion({
      accessToken: respuesta.accessToken,
      refreshToken: respuesta.refreshToken,
      usuario: respuesta.usuario,
    });
    dispatch({
      type: 'SESION_INICIADA',
      usuario: respuesta.usuario,
      accessToken: respuesta.accessToken,
      refreshToken: respuesta.refreshToken,
    });
  }, []);

  const logout = useCallback(async () => {
    if (state.usuario) {
      await logoutApi(state.usuario.id);
    }
    // Limpieza COMPLETA: token cifrado + toda la caché/outbox local, no solo el token.
    await tokenStorage.borrarSesion();
    await wipeLocalDatabase();
    setSession({ accessToken: null, refreshToken: null });
    dispatch({ type: 'SESION_CERRADA' });
  }, [state.usuario]);

  const guardarDestinoPendiente = useCallback((destino: DestinoPendiente) => {
    dispatch({ type: 'GUARDAR_DESTINO_PENDIENTE', destino });
  }, []);

  const consumirDestinoPendiente = useCallback((): DestinoPendiente | null => {
    const destino = state.pendingRedirect;
    if (destino) {
      dispatch({ type: 'LIMPIAR_DESTINO_PENDIENTE' });
    }
    return destino;
  }, [state.pendingRedirect]);

  return (
    <AuthContext.Provider
      value={{
        status: state.status,
        usuario: state.usuario,
        pendingRedirect: state.pendingRedirect,
        login,
        logout,
        guardarDestinoPendiente,
        consumirDestinoPendiente,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
