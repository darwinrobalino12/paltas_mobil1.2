# Semana 14 — Capacidades nativas

## Capacidades elegidas

| Capacidad | Tipo | Por qué |
|---|---|---|
| Ubicación GPS "en uso" | **Esencial** | Ya es parte del valor del negocio: las coordenadas de un Punto de Interés (agregada en la Semana 13, ahora con el flujo de permisos correcto). |
| Notificaciones locales | **Opcional** | Avisa cuando la cola de sincronización offline (Semana 12) termina de enviar los puntos de interés pendientes, sin que el usuario tenga que quedarse mirando la pantalla. |

No se agregó ningún permiso de almacenamiento/galería: elegir una foto de la
galería sigue usando el selector nativo del sistema (`launchImageLibrary`),
que en Android 13+/16 y en iOS no requiere permiso alguno.

## Verificación de los plugins adoptados

Verificación hecha el 2026-09-15 contra el registro de npm (`npm view <paquete>`) y el contenido instalado en `node_modules/`:

| Criterio | `react-native-permissions` | `@notifee/react-native` |
|---|---|---|
| Versión instalada | 5.6.2 | 9.1.8 |
| Última publicación | 2026-09-14 (un día antes de esta verificación — mantenimiento activo) | 2024-12-20 (~1 año y 9 meses; sigue siendo la versión `latest`, no hay una más nueva ni está deprecado) |
| Repositorio / mantenedor | `github.com/zoontek/react-native-permissions`, estándar de facto de la comunidad RN | `github.com/invertase/notifee`, mismo equipo de `react-native-firebase` |
| ¿Deprecado en npm? | No | No |
| Manifiesto de privacidad iOS (`PrivacyInfo.xcprivacy`) | **Sí**, incluido en `ios/PrivacyInfo.xcprivacy` del paquete | **No se encontró** ningún `PrivacyInfo.xcprivacy` en el paquete instalado |
| Por qué se eligió igual | Cubre Android **e** iOS con la misma API (a diferencia de `PermissionsAndroid`, que es Android-only) y expone los 4 estados que pide este taller. | Es la librería de notificaciones locales para RN con más adopción y mejor documentada; el proyecto se prueba y entrega en **Android físico**, donde el manifiesto de privacidad de Apple no aplica. |

**Limitación documentada, no oculta**: `@notifee/react-native` no trae manifiesto de privacidad de Apple. Esto no bloquea la entrega de esta semana (dispositivo de prueba Android), pero si el proyecto se distribuyera en la App Store habría que evaluar una alternativa o agregar manualmente un `PrivacyInfo.xcprivacy` a nivel de la app.

## Declaraciones de permisos

| Permiso | Plataforma | Dónde se declara | Propósito concreto en la app |
|---|---|---|---|
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Android | `AndroidManifest.xml` | Obtener la coordenada GPS del punto de interés que el usuario admin está creando. |
| `CAMERA` | Android | `AndroidManifest.xml` | Tomar la foto del punto de interés (no se usa para ningún otro fin, ej. no hay escáner ni video). |
| `POST_NOTIFICATIONS` | Android 13+/16 | `AndroidManifest.xml` | Mostrar la notificación local de "sincronización completada". |
| `INTERNET` | Android | `AndroidManifest.xml` | Comunicarse con el backend (ya existía, no es parte de esta entrega). |
| `NSLocationWhenInUseUsageDescription` | iOS | `Info.plist` | "Usamos tu ubicación mientras usas la app para guardar las coordenadas exactas del punto de interés que estás creando." Solo "en uso", nunca "always". |
| `NSCameraUsageDescription` | iOS | `Info.plist` | "Usamos la cámara para tomar la foto del punto de interés que estás registrando en el mapa." |
| `NSPhotoLibraryAddUsageDescription` | iOS | `Info.plist` | "Guardamos una copia de la foto del punto de interés en tu galería cuando la tomas con la cámara." Se eligió el permiso de **solo agregar**, no el de lectura completa de la galería, porque la app nunca necesita leer fotos existentes del usuario. |

**Sin permisos de acceso amplio innecesarios**: no se declara `READ_MEDIA_IMAGES`/`READ_EXTERNAL_STORAGE` (la galería usa el selector nativo del sistema) ni `ACCESS_BACKGROUND_LOCATION` (la ubicación es solo "en uso", nunca en segundo plano) ni `NSPhotoLibraryUsageDescription` completo (solo el de "agregar", más restrictivo).

## Nivel de API objetivo

`android/build.gradle`: `compileSdkVersion 37`, `targetSdkVersion 36` (Android 16), `minSdkVersion 24`. Cumple con el requisito de Google Play de apuntar a una versión de API dentro del plazo vigente respecto al último Android estable (16 / API 36).

## Arquitectura de permisos

Toda la lógica de permisos vive en `src/permissions/` y se reutiliza para
cámara, ubicación y notificaciones:
- `types.ts` — el tipo `EstadoPermiso` con los 4 estados.
- `permisosConfig.ts` — qué permiso nativo corresponde a cada capacidad, por plataforma.
- `rationale.ts` — muestra la pantalla de justificación (rationale) antes del diálogo nativo.
- `usePermiso.ts` — hook con `verificar()` (solo lee el estado), `solicitarConExplicacion()` (rationale + diálogo nativo) y `abrirAjustes()`.

## Matriz de los 4 estados

| Estado | Dónde se maneja | Comportamiento |
|---|---|---|
| **Concedido** | `CrearPuntoScreen.tsx` (`obtenerUbicacionActual`, `tomarFoto`), `PerfilScreen.tsx` | Se usa la capacidad normalmente. |
| **Denegado** | Mismo lugar | Se muestra la pantalla de rationale y, si el usuario acepta, se pide el permiso; si no acepta o el sistema lo vuelve a denegar, se muestra un mensaje de error y el formulario sigue siendo usable sin esa capacidad. |
| **Denegado permanente** | Mismo lugar | Ya no se puede volver a mostrar el diálogo nativo: se explica la situación y se ofrece un botón "Abrir ajustes" que lleva a los Ajustes del sistema (`openSettings()` de `react-native-permissions`). |
| **No disponible / restringido** | Mismo lugar | El dispositivo no tiene la capacidad (ej. sin GPS): se informa al usuario y se deshabilita esa parte del formulario; el resto de la app sigue funcionando. |

Caso especial de ubicación: además del permiso, se verifica si el **servicio
de GPS del dispositivo** está encendido. Se detecta por el código de error 2
(`POSITION_UNAVAILABLE`) que devuelve `Geolocation.getCurrentPosition`, y se
ofrece un botón que abre la pantalla de ajustes de ubicación del sistema.

Caso especial de notificaciones: ni Android ni iOS permiten distinguir de
forma confiable "denegado" de "denegado permanente" una vez que el usuario ya
respondió una vez al diálogo nativo, así que `notificationService.ts` trata
cualquier rechazo posterior al primero como permanente y siempre ofrece el
botón de Ajustes (ver comentario en el propio archivo).

## Integración con persistencia y sincronización

- Las coordenadas capturadas se guardan en SQLite (`puntos_interes.latitud/longitud`) y viajan en el `outbox` cuando no hay conexión (Semana 12), sin cambios adicionales — esto ya funcionaba, solo se corrigió cómo se pide el permiso.
- La preferencia "notificaciones activadas" se guarda en `schema_meta` (reutilizando `getMeta`/`setMeta`, ya existente) en vez de agregar una dependencia nueva solo para un booleano.
- `useNetworkSync.ts` ahora sincroniza tanto al reconectar como al abrir la app (antes solo sincronizaba al reconectar), y dispara una notificación local cuando la sincronización realmente completó operaciones pendientes.

## Casos de prueba en el dispositivo Android físico

Los 5 casos que debe cubrir tanto la prueba manual como el video:

1. **Permiso concedido, ambas capacidades**: en "Nuevo punto de interés", conceder ubicación (aparecen coordenadas) y cámara (se toma y previsualiza la foto).
2. **Permiso denegado (no permanente)**: tocar "Cancelar" en el diálogo nativo de ubicación o cámara → mensaje de error visible, el formulario sigue usable, la app no se cierra ni se traba.
3. **Denegación permanente + acceso a Ajustes**: denegar marcando "No volver a preguntar" (o denegar dos veces seguidas) → aparece el botón "Abrir ajustes" y lleva efectivamente a los ajustes de la app en el sistema.
4. **Integración con almacenamiento local**: crear un punto de interés con ubicación en modo avión → se guarda en SQLite y queda en la cola (`outbox`); verificar en Perfil que "Operaciones pendientes de sincronizar" aumenta.
5. **Integración con backend**: reactivar la red → la cola se vacía sola (Semana 12), el contador de pendientes baja a 0, y si las notificaciones están activadas llega el aviso de sincronización completada.

Casos adicionales, útiles para el documento pero no imprescindibles en el video:
- **GPS apagado (servicio, no permiso)**: con el permiso concedido, apagar el GPS del dispositivo y tocar "Usar mi ubicación actual" → debe aparecer el aviso "GPS desactivado" con botón a los ajustes de ubicación.
- **Notificaciones — no disponible/bloqueadas**: denegar el permiso de notificaciones desde Ajustes del sistema y volver a abrir Perfil → debe verse "Bloqueadas por el sistema" con el botón para abrir Ajustes.

## Repositorio

https://github.com/darwinrobalino12/paltas_mobil1.2
