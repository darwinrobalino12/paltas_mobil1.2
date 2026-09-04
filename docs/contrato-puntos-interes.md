# Contrato del endpoint — Punto de Interés

Backend: `proyecto_paltas/paltas mobil/routes/puntos.js` (+ `middlewares/auth.js`).
Base URL desde la app: `API_BASE_URL` en `src/config/api.ts` (`http://10.0.2.2:3000/api` en el emulador Android).

## GET /api/puntos-rapido
Público. Devuelve el catálogo completo con su categoría (JOIN optimizado).

## GET /api/puntos-interes/:id
Público. Permite reconstruir `DetallePuntoScreen` a partir únicamente del `id` de la ruta.

- `200` → objeto `PuntoInteres` con `categoria` embebida.
- `404` → `{ "error": "Punto de interés no encontrado." }`

## POST /api/puntos-interes
Privado — requiere `Authorization: Bearer <accessToken>` y rol `admin`.

Headers opcionales: `Idempotency-Key: <uuid>` (recomendado siempre que la creación
pueda reintentarse, p. ej. desde la cola offline — evita duplicar el punto si el
cliente reenvía la misma operación).

### Body

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `nombre` | string | Sí | 3–100 caracteres (se recorta con `trim`) |
| `descripcion` | string | No | máx. 500 caracteres |
| `categoriaId` | number | Sí | debe existir en `GET /api/categorias` |

### Respuestas

| Código | Cuándo | Cuerpo |
|---|---|---|
| `201` | Creado con éxito | Objeto `PuntoInteres` con `categoria` e `updatedAt` del servidor |
| `401` | Falta el token, o es inválido/expirado | `{ "error": "..." }` |
| `403` | Autenticado, pero el rol no es `admin` | `{ "error": "No tienes permiso para realizar esta acción." }` |
| `422` | Uno o más campos no cumplen la regla (se acumulan TODOS los errores, no solo el primero) | `{ "errors": [{ "field": "nombre", "message": "..." }, ...] }` |

Las reglas de validación del cliente (`src/validation/puntoInteres.ts`) están
derivadas 1:1 de esta tabla — cualquier cambio en el backend debe reflejarse ahí.

## GET /api/categorias
Público. `[{ "id": number, "nombre": string }, ...]` — usado para poblar el picker
del formulario de creación (también se cachea en SQLite para uso offline).

## Autenticación

### POST /api/login
Body: `{ "username": string, "password": string }`.

- `200` → `{ accessToken, refreshToken, usuario: { id, username, rol } }`.
  `accessToken` expira en 15 min, `refreshToken` en 7 días.
- `401` → credenciales incorrectas.
- `422` → falta `username` y/o `password`.

### POST /api/refresh
Body: `{ "refreshToken": string }` → `{ "accessToken": string }`, o `401` si el
refresh token es inválido, expiró, o la sesión fue revocada (logout).

### POST /api/logout
Body: `{ "usuarioId": number }` — revoca el refresh token en Redis. Best-effort:
el cliente borra la sesión local aunque esta llamada falle.

## Usuarios de prueba (sembrados automáticamente)
| username | password | rol |
|---|---|---|
| `petri` | `password123` | `admin` (puede crear puntos) |
| `usuario_demo` | `password123` | `user` (recibe 403 al intentar crear) |
