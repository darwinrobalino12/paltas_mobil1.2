// Configuración del cliente HTTP: dirección base por ambiente y tiempo de espera.
//
// __DEV__ es una variable global que React Native define solo (true en modo
// desarrollo, false en un build de producción/release) — no hay que instalar
// nada para usarla.
//
// En desarrollo usamos 10.0.2.2, la dirección especial con la que el emulador
// de Android accede a "localhost" de la PC (donde corre el backend con
// docker-compose). En producción, la app hablaría con un servidor real.
const HOST_DESARROLLO = 'http://10.0.2.2:3000';
// APK de prueba (Semana 14): el celular del compañero no está en la misma red
// que el backend, así que exponemos el backend con un túnel de ngrok
// (https://ngrok.com/) mientras se hacen las pruebas. OJO: la URL gratuita de
// ngrok cambia cada vez que se reinicia el túnel — hay que actualizar esta
// constante y volver a generar el APK (gradlew assembleRelease) cada vez que
// eso pase. No es la URL final de producción, es solo para esta entrega.
const HOST_PRODUCCION = 'https://wieldable-create-species.ngrok-free.dev'; // URL de ngrok (Semana 14) — cambia si se reinicia el túnel

export const API_HOST = __DEV__ ? HOST_DESARROLLO : HOST_PRODUCCION;

// Seguridad: en producción NUNCA se debe hablar con el backend por HTTP sin
// cifrar (viajarían credenciales y tokens en texto plano). Si alguien cambia
// HOST_PRODUCCION por error a "http://", la app falla al arrancar en vez de
// mandar datos sensibles sin cifrar.
if (!__DEV__ && !API_HOST.startsWith('https://')) {
  throw new Error('Configuración inválida: en producción la API debe usarse por HTTPS.');
}

export const API_BASE_URL = `${API_HOST}/api`;

// Tiempo de espera explícito para toda petición HTTP (ver fetchConTimeout en
// api/client.ts). Sin esto, una conexión colgada dejaría la pantalla
// "cargando..." para siempre.
export const TIMEOUT_MS = 15000;
