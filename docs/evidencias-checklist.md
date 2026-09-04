# Checklist de evidencias — completar con capturas reales del dispositivo/emulador

> Esta app y su backend fueron corregidos, ampliados y verificados con ayuda de
> Claude Code (Anthropic) durante la sesión de desarrollo. El resumen de esa
> asistencia está al final de este documento; complétalo/ajústalo con tus
> propias palabras antes de entregar.

## 1. Recorrido funcional completo

Marca cada paso cuando tengas la captura correspondiente.

- [ ] **Inicio de sesión**: login con `petri` / `password123` (rol admin) → llega a la app.
- [ ] **Inicio de sesión con rol no autorizado**: login con `usuario_demo` / `password123`.
- [ ] **Listado**: catálogo de puntos de interés cargando desde el backend.
- [ ] **Detalle**: entrar a un punto desde la lista.
- [ ] **Detalle por deep link**: cerrar la app y entrar directo con
      `adb shell am start -a android.intent.action.VIEW -d "paltasapp://puntos/1"`
      — debe mostrar el detalle sin pasar por la lista.
- [ ] **Creación (rol admin)**: crear un punto de interés nuevo, ver que aparece en la lista.
- [ ] **Creación (rol user)**: con `usuario_demo`, intentar crear un punto → debe mostrar
      "No tienes permiso" (403), sin cerrar la sesión ni redirigir a Login.
- [ ] **Validación de formulario**: dejar el nombre vacío y salir del campo (blur) → error visible;
      intentar enviar igual → error persiste.
- [ ] **Redirección post-login**: cerrar sesión, ir directo a "Crear punto" sin loguearse →
      debe mandar a Login y, tras iniciar sesión, volver exactamente a "Crear punto".
- [ ] **Persistencia de sesión**: cerrar la app por completo (no solo minimizar) y reabrirla →
      debe seguir logueado, sin pedir credenciales de nuevo.
- [ ] **Cierre de sesión**: logout desde Perfil → intentar entrar de nuevo a "Crear punto"
      sin loguearse debe volver a pedir credenciales.

## 2. Prueba en modo avión

- [ ] Activar modo avión con el catálogo ya cargado antes → la pantalla NO debe quedar vacía
      (debe mostrarse lo cacheado en SQLite) y debe verse el aviso de "datos posiblemente
      desactualizados".
- [ ] Con modo avión activo, crear un punto de interés (rol admin) → debe guardarse localmente
      y mostrar el aviso de "se enviará automáticamente al reconectar", sin error de red visible
      al usuario.
- [ ] Verificar en Perfil que el contador de "operaciones pendientes de sincronizar" subió en 1.
- [ ] Desactivar modo avión → esperar unos segundos → el contador debe volver a 0 y el punto
      creado offline debe aparecer en la lista con su id real del servidor.

## 3. Registro de uso de herramientas de IA

Herramienta: **Claude Code** (Anthropic, modelo Claude Opus/Sonnet 5 según sesión).

| Elemento | Detalle |
|---|---|
| Consultas realizadas | Revisión del proyecto para corregir errores; luego implementación de navegación (React Navigation), autenticación JWT con roles, manejo de estado (Context API), formulario de creación con validación y mapeo de errores 422/401/403, y almacenamiento local offline-first (SQLite + outbox + Keychain). |
| Resultados utilizados | Código en `src/`, `App.tsx`, `index.js`, y en el backend (`proyecto_paltas/paltas mobil/routes`, `middlewares`, modelos). Ver el historial de cambios (git diff) para el detalle exacto. |
| Modificaciones aplicadas manualmente | _(completar si ajustaste algo a mano después de recibir el código: nombres de rutas, textos, estilos, etc.)_ |
| Verificaciones técnicas efectuadas | `npx tsc --noEmit` (sin errores), `npx eslint` (sin errores), `npx jest` (test existente en verde), pruebas end-to-end del backend con `curl` contra Docker real (login, 401, 403, 422, 201, idempotencia, 404) — ver consola de la sesión. Verificación en emulador/dispositivo real: **pendiente, completar esta sección tú mismo** (esto no se puede automatizar desde la sesión de desarrollo). |
| Decisiones con implicaciones de seguridad revisadas | Contraseñas con hash `bcrypt` (antes viajaban y se comparaban en texto plano); tokens JWT de corta duración (15 min) + refresh revocable en Redis; tokens guardados en Keychain/Keystore cifrado, nunca en AsyncStorage; `.env` con secretos agregado a `.gitignore`. |
