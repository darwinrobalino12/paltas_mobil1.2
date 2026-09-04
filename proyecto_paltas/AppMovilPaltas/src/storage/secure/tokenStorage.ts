import * as Keychain from 'react-native-keychain';

const SERVICE = 'paltas.auth.session';

export interface UsuarioAutenticado {
  id: number;
  username: string;
  rol: 'admin' | 'user';
}

export interface SesionGuardada {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioAutenticado;
}

// Único lugar del proyecto donde se persisten accessToken/refreshToken: siempre
// cifrados vía Keychain/Keystore, nunca en AsyncStorage ni en la base SQLite.
export async function guardarSesion(sesion: SesionGuardada): Promise<void> {
  await Keychain.setGenericPassword(sesion.usuario.username, JSON.stringify(sesion), {
    service: SERVICE,
  });
}

export async function leerSesion(): Promise<SesionGuardada | null> {
  const credenciales = await Keychain.getGenericPassword({ service: SERVICE });
  if (!credenciales) {
    return null;
  }
  try {
    return JSON.parse(credenciales.password) as SesionGuardada;
  } catch {
    return null;
  }
}

export async function borrarSesion(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
