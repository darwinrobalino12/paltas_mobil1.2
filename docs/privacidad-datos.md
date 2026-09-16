# Inventario de datos y privacidad — AppMovilPaltas

## Inventario y clasificación

| Dato | Naturaleza | Dónde vive | Cifrado |
|---|---|---|---|
| `accessToken`, `refreshToken` | Sensible (credencial de sesión) | Keychain/Keystore (`src/storage/secure/tokenStorage.ts`) | Sí (cifrado del sistema operativo) |
| Usuario autenticado (`id`, `username`, `rol`) | Identificador de cuenta, no sensible en reposo | Memoria (`AuthContext`), rehidratado desde Keychain al abrir la app | Va dentro del mismo registro cifrado que los tokens |
| Catálogo de Puntos de Interés (`nombre`, `descripcion`, categoría) | Dato de negocio público (no personal) | SQLite (`puntos_interes`, `categorias`) | No — es información pública del catálogo turístico |
| Cola de operaciones pendientes (outbox) | Operacional, generado por el cliente | SQLite (`outbox`) | No — no contiene credenciales, solo el payload de la creación (nombre/descripción/categoría/coordenadas) |
| Coordenadas GPS de un punto de interés | Dato de negocio (ubicación del lugar, no de la persona) | SQLite (`puntos_interes.latitud/longitud`), solo si el usuario las agrega al crear el punto | No — es información pública del catálogo turístico |
| Foto de un punto de interés | Dato de negocio | Se sube al backend al crear el punto (no viaja offline); una copia queda en la galería del dispositivo por `saveToPhotos` | No aplica — no se persiste el binario en el cliente |
| Preferencia de notificaciones activadas | Configuración de UI | SQLite (`schema_meta`) | No |
| Marca de última sincronización | Metadato de UI | SQLite (`schema_meta`) | No |
| Valores de un formulario en edición | Efímero | Memoria (`useState` / react-hook-form) | No aplica — nunca se persiste |

**Ningún dato sensible se guarda en un almacén clave-valor sin cifrar**: los
únicos secretos de la app (`accessToken`/`refreshToken`) van exclusivamente a
Keychain/Keystore vía `react-native-keychain`, nunca a `AsyncStorage` ni a SQLite.

## Qué datos personales se almacenan, con qué fin y por cuánto tiempo

| Dato personal | Finalidad | Retención |
|---|---|---|
| `username` (usuario elegido al crear la cuenta) | Identificar al usuario autenticado y mostrarlo en Perfil | Mientras la sesión esté activa; se borra del dispositivo al cerrar sesión |
| `accessToken` / `refreshToken` | Mantener la sesión iniciada sin pedir la contraseña en cada petición | `accessToken`: 15 minutos. `refreshToken`: 7 días o hasta logout (lo que ocurra primero) |
| `rol` (`admin`/`user`) | Determinar si la cuenta puede crear puntos de interés (autorización) | Igual que la sesión |

Desde la Semana 13 la app sí usa dos capacidades del dispositivo, ambas
descritas en detalle en `docs/semana14-capacidades-nativas.md`:
- **Ubicación (GPS)**: solo "en uso", solo cuando el usuario admin toca "Usar
  mi ubicación actual" al crear un punto de interés. Nunca se pide en segundo
  plano ni al abrir la app.
- **Cámara**: solo cuando el usuario admin toca "Tomar foto"; la foto se sube
  al backend como parte del punto de interés y nunca se guarda en el
  dispositivo salvo la copia que el propio sistema operativo hace en la
  galería (`saveToPhotos`).

No se recolectan contactos ni ningún otro dato sensible del dispositivo, y no
se usa ubicación "siempre" (background). La contraseña **nunca** se persiste
en el cliente: viaja una sola vez en el `POST /api/login` y se descarta
inmediatamente después de enviarse (ver `LoginScreen.tsx`); en el backend se
guarda con hash `bcrypt`, nunca en texto plano.

Las notificaciones locales (Semana 14) son generadas y mostradas enteramente
en el dispositivo por `notifee`: no se envían a ningún servidor de terceros ni
usan un servicio de push remoto.

## Minimización aplicada
- De `Categoria` solo se cachea `id` y `nombre` — es lo único que usa el picker
  y `PlaceCard`; no se replica ninguna otra columna que el servidor pudiera tener.
- El esquema local de `puntos_interes` no es una copia 1:1 del esquema del
  servidor: agrega columnas de control de cliente (`pending_sync`,
  `deleted_locally`, `local_updated_at`) que el servidor ni conoce ni necesita.

## Limpieza al cerrar sesión
`AuthContext.logout()` (`src/context/AuthContext.tsx`) hace una limpieza
**completa**, no solo del token:
1. Revoca el `refreshToken` en el backend (`POST /api/logout`, best-effort).
2. Borra el registro cifrado de Keychain (`tokenStorage.borrarSesion()`).
3. Vacía por completo la base SQLite local (`wipeLocalDatabase()`): catálogo
   cacheado, categorías y cualquier operación pendiente en el outbox.

## Caducidad de caché
El catálogo local expira a los 5 minutos (`CACHE_TTL_MS` en
`src/storage/sqlite/schemaMeta.ts`). Pasado ese plazo, `ListaPuntosScreen`
muestra el aviso "Datos posiblemente desactualizados" con la fecha de la
última sincronización y dispara un refresco en background — pero sigue
mostrando lo que ya tenía en caché mientras tanto (la pantalla nunca queda vacía).

## Resolución de conflictos — qué se sacrifica
Política: *last-write-wins* por `server_updated_at` (el timestamp que el
servidor asigna a cada punto de interés, nunca el reloj del dispositivo).

**Qué se sacrifica explícitamente**: si dos ediciones concurrentes offline
llegaran a chocar sobre el mismo registro, la que llegue después al servidor
gana y la otra se pierde sin fusión ni aviso al usuario que la perdió. Esta
semana solo se implementó `CREATE` de punta a punta (no `UPDATE`), así que este
escenario de conflicto todavía no tiene un caso ejecutable real — la política y
el esquema (`server_updated_at` por fila) ya están listos para cuando se
agregue edición.
