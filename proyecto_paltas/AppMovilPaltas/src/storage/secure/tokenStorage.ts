import * as Keychain from 'react-native-keychain';

const SERVICE = 'paltas.auth.session';

// Modelo de "Usuario" tal como lo entiende la app. Dos cosas a notar frente
// a lo que realmente existe en la base de datos (models/Usuario.js):
// 1. El backend NUNCA envía el campo `password` en la respuesta de /login
//    (ver routes/auth.js) — es una exclusión intencional, no un descuido:
//    ese campo simplemente no existe en este modelo del lado del cliente.
// 2. `rol` es un tipo unión restringido ('admin' | 'user'), no un string
//    cualquiera — si el backend mandara un rol distinto, TypeScript avisaría
//    en tiempo de compilación en cualquier lugar donde se use.
export interface UsuarioAutenticado {
  id: number;
  username: string;
  rol: 'admin' | 'user';
}

// "Serialización": convierte el JSON de /login en un UsuarioAutenticado.
export function usuarioDesdeJson(json: any): UsuarioAutenticado {
  return {
    id: json.id,
    username: json.username,
    rol: json.rol,
  };
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
