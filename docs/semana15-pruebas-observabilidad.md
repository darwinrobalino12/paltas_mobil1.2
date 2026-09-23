# Semana 15 — Pruebas automáticas y monitoreo

> Usé Claude Code (Anthropic) como ayuda para esta semana. El detalle de cómo lo usé está en la sección 9.

## 1. Riesgos del proyecto

Antes de escribir pruebas, pensé qué cosas se pueden romper en la app y qué tan grave sería.

| Riesgo | Qué pasaría | Qué tan probable | Qué tan grave | Se prueba? |
|---|---|---|---|---|
| Se cae la conexión al cargar el catálogo | La pantalla principal se queda cargando o en blanco | Alta | Alta | Sí |
| El token de sesión expira mientras se usa la app | Las peticiones fallan y el usuario no entiende por qué | Media | Alta | Sí |
| Se manda un formulario con datos inválidos | El backend lo rechaza pero el usuario ve errores confusos | Media | Media | Sí |
| Un token o contraseña se cuela en un log | Problema de seguridad, no solo un bug | Baja | Alta | Sí |
| Se pierde un punto de interés guardado offline si se cierra la app a la fuerza | El dato nunca llega al servidor | Baja | Alta | No esta semana (difícil de simular con las herramientas que tengo, queda pendiente) |
| Un cambio de estilo rompe botones/tarjetas en varias pantallas | Se ve mal la app | Baja | Baja | No (es opcional según la guía y no alcanzaba el tiempo) |
| La lista del catálogo se ve lenta con muchos puntos | Mala experiencia en celulares más viejos | Media | Media | Pendiente, necesito un Android físico (el mío es iPhone) |
| Un error se repite en producción y nadie se entera | No se puede corregir lo que no se ve | Media | Alta | Sí |
| Se reintenta el login sin parar si el token falla | La app se queda pegada | Baja | Alta | Sí, indirectamente |

## 2. Qué decidí probar y qué no

Prioricé lo que es más probable que se rompa y lo que es más fácil de aislar: las funciones que deciden qué mostrar en pantalla, los mensajes de error, los 4 estados de la pantalla principal, las respuestas del backend (200, 401, 422, tiempo agotado) y la validación del formulario.

No hice pruebas de regresión visual porque la guía dice que es opcional y no alcanzaba el tiempo. Tampoco pude hacer la prueba de extremo a extremo ni medir el rendimiento porque esas necesitan un celular Android físico conectado, y el mío es iPhone — quedó todo preparado para hacerlo con mi compañero en la próxima sesión.

## 3. Pruebas que agregué

En total quedaron 56 pruebas en 11 archivos, y corren todas sin internet, sin emulador y en cualquier orden (lo comprobé con `npx jest --randomize`).

- `remoteState.test.ts` — los 4 estados que puede tener la pantalla (cargando, con datos, vacío, error).
- `errors.test.ts` — que cada tipo de error del backend muestre el mensaje correcto.
- `puntoInteres.test.ts` — las reglas de validación del formulario.
- `schemaMeta.test.ts` — cuándo se considera vencida la caché local.
- `usePermiso.test.ts` — los 4 estados de un permiso (concedido, denegado, etc.).
- `notificationService.test.ts` — lo mismo pero para el permiso de notificaciones.
- `logger.test.ts` — que el logger tape tokens y contraseñas antes de mostrarlos.
- `client.test.ts` — que el cliente HTTP responda bien ante un 200, un 401 (renueva el token), un 403, un 422 y un tiempo de espera agotado.
- `PuntosScreen.test.tsx` — los 4 estados de la pantalla principal, usando un backend falso para no depender de internet.
- `CrearPuntoScreen.test.tsx` — que el formulario no deje enviar datos inválidos y que los errores del servidor salgan en el campo correcto.
- `App.test.tsx` — antes solo comprobaba que la app no se rompiera al abrir; ahora también confirma que se llega al catálogo.

También tuve que arreglar la configuración de Jest (`jest.setup.js`): tenía un simulador de una librería que ya no se usa, y le faltaban simuladores de varias librerías nativas (cámara, ubicación, notificaciones, etc.) que hacían que ninguna prueba de pantallas pudiera correr.

## 4. Cobertura

Con `npx jest --coverage` esto es lo que salió:

```
Statements : 43.8%
Branches   : 34.16%
Functions  : 42.44%
Lines      : 43.8%
```

No es un número que haya que maximizar, sino un mapa de qué quedó sin revisar. Está bien cubierto donde puse el esfuerzo (validaciones, manejo de errores, permisos) y bajo donde decidí no entrar todavía (algunas pantallas y el acceso directo a la base de datos).

Revisando el reporte encontré que toda la parte de "guardar sin conexión" del formulario de crear punto no tenía ninguna prueba, así que le agregué una: que al no haber internet, el punto se guarde localmente y se encole para sincronizar después, sin llamar al backend.

## 5. Registro de errores (logs) y monitoreo de fallos

Antes la app casi no dejaba registro de nada (solo 2 líneas de log en todo el proyecto). Ahora hay un logger (`src/utils/logger.ts`) con niveles (debug, info, warn, error) que además tapa automáticamente cualquier dato que parezca un token, contraseña o correo antes de mostrarlo — lo comprobé con una prueba y revisando a mano los lugares donde se usa.

También agregué Sentry (una herramienta gratuita para enterarse de errores en producción). Está configurada para:
- No mandar el token de autorización ni datos personales.
- Identificar al usuario solo con un número interno, nunca con su usuario o correo.
- Tener un botón para provocar un error de prueba, pero ese botón solo existe mientras se está desarrollando la app (no llega a la versión final).

Todavía falta crear la cuenta gratuita de Sentry y confirmar que el error de prueba realmente llega al panel de control.

## 6. Lo que falta hacer con el celular Android físico

Esto ya está preparado en el código pero no lo pude ejecutar yo porque no tengo un Android a mano:

- Agregué un permiso en el manifiesto de Android para poder usar el "profiler" (medidor de rendimiento) de Android Studio.
- Escribí el archivo `.maestro/flujo-critico.yaml` con la única prueba de extremo a extremo que pide la guía (entrar, crear un punto sin conexión, ver que queda pendiente, reconectar y ver que se sincroniza solo).
- Falta correr esa prueba y medir el rendimiento en un dispositivo real, ver si el problema (si aparece alguno) es del hilo de interfaz o del hilo de dibujo, corregirlo, y volver a medir para confirmar que mejoró.

## 7. Integración continua

Configuré que cada vez que se sube código al repositorio, se corran automáticamente el lint, el chequeo de tipos y todas las pruebas (`.github/workflows/ci.yml`). Así, si alguien rompe algo sin darse cuenta, se ve enseguida.

## 8. Checklist antes de publicar

- [x] Todas las pruebas pasan, en cualquier orden.
- [x] Ninguna prueba está desactivada.
- [x] Corrí la cobertura y agregué una prueba a una parte que no estaba cubierta.
- [x] No hay errores de tipos ni de lint.
- [x] Los logs no muestran tokens ni contraseñas.
- [x] El monitoreo de errores está configurado y filtra datos sensibles.
- [x] Las pruebas corren solas cada vez que se sube código.
- [ ] Falta crear la cuenta de Sentry y confirmar que un error de prueba llega bien.
- [ ] Falta correr la prueba de extremo a extremo y medir el rendimiento en un Android físico.

## 9. Cómo usé la IA esta semana

Herramienta: **Claude Code** (Anthropic).

| Elemento | Detalle |
|---|---|
| Consultas realizadas | Le pedí que revisara cómo estaba armado el proyecto para saber qué probar, que armara un plan de pruebas ordenado por riesgo, y que fuera implementando las pruebas, el logger, Sentry y la integración continua. |
| Resultados utilizados | Los archivos de prueba nuevos, el logger, la configuración de Sentry, el workflow de integración continua y el archivo de la prueba de extremo a extremo. |
| Modificaciones aplicadas manualmente | _(completar si cambié algo a mano: el DSN de Sentry, algún nombre de categoría, etc.)_ |
| Verificaciones técnicas efectuadas | Corrí todas las pruebas (`npx jest`), el chequeo de tipos y el lint, y confirmé que las pruebas pasan en cualquier orden. Revisé que ninguna prueba fuera "falsa" (que realmente comprobara algo, no solo que el código no tirara error). |
| Decisiones de seguridad revisadas | Que los logs y Sentry no muestren tokens, contraseñas ni datos personales, y que el identificador de usuario sea un número interno y no el correo. |
