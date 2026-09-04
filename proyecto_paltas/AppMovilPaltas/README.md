# Taller de Desarrollo Multiplataforma - App Paltas

Aplicación móvil desarrollada con **React Native** y TypeScript para la gestión del proyecto.

---

## 📋 1. Selección y Justificación del Framework
* **Framework:** React Native (TypeScript).
* **Justificación:** Se seleccionó React Native debido a su capacidad de ofrecer rendimiento nativo mediante componentes reales y el motor Hermes, permitiendo reutilizar lógica de negocio multiplataforma y facilitando la integración con herramientas de desarrollo modernas y depuración en tiempo real.

---

## 🛠️ 2. Requisitos Previos y Entorno
* **Node.js** (LTS) y npm.
* **JDK 17** o superior.
* **Android Studio** con Android SDK y herramientas de compilación configuradas.

---

## 📱 3. Configuración del Dispositivo de Ejecución
* **Destino:** Emulador Android virtual configurado en Android Studio (**Pixel 4 / API 34+**).
* **Justificación:** Se optó por un dispositivo virtual por su disponibilidad inmediata, control sobre versiones de Android y capacidad de simular escenarios de prueba sin depender de hardware físico ni restricciones de batería o puertos USB.

---

## ⚙️ 4. Configuración del Entorno y Variables de API

### 4.1 Instalar la app móvil
1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```

### 4.2 Levantar el backend (Node.js + Express + MySQL + Redis)
El backend vive en `proyecto_paltas/paltas mobil` y necesita MySQL y Redis corriendo (vía Docker) además de sus propias dependencias.

1. Levantar los servicios de base de datos y caché con Docker:
   ```bash
   cd proyecto_paltas
   docker-compose up -d
   ```
   Esto expone MySQL en el puerto `3307` (mapeado al `3306` del contenedor) y Redis en el `6379`.

2. Instalar las dependencias del backend y arrancar el servidor:
   ```bash
   cd "paltas mobil"
   npm install
   npm run dev
   ```
   El servidor queda escuchando en `http://localhost:3000`. Al iniciar, crea automáticamente las tablas (Sequelize sync) y siembra datos de prueba (categorías, puntos de interés y un usuario `petri`).

### 4.3 Configurar la URL de la API en la app móvil
La URL base está definida en [`src/config/api.ts`](src/config/api.ts):
```ts
export const API_BASE_URL = 'http://10.0.2.2:3000/api';
```
- `10.0.2.2` es la IP especial que usa el **emulador de Android** para llegar al `localhost` de tu PC — es el valor por defecto y no requiere cambios si usas el emulador Android descrito en la sección 3.
- Si usas el **simulador de iOS**, cambia la URL a `http://localhost:3000/api`.
- Si usas un **dispositivo físico**, reemplázala por la IP de red local de tu PC (por ejemplo `http://192.168.1.X:3000/api`), asegurándote de que el dispositivo esté en la misma red.

### 4.4 Ejecutar la app
Con el backend corriendo y el emulador/dispositivo listo:
```bash
npm run android
# o bien
npm run ios
```
En la pestaña **Perfil** hay un botón de diagnóstico "Probar conexión con el backend" que valida `GET /api/saludo`.

---

## 🔐 5. Cuentas de prueba

El backend siembra automáticamente estos usuarios la primera vez que arranca contra una base vacía:

| Usuario | Contraseña | Rol | Puede crear puntos de interés |
|---|---|---|---|
| `petri` | `password123` | `admin` | Sí |
| `usuario_demo` | `password123` | `user` | No (recibe 403) |

Catálogo y detalle son públicos (no requieren login). Crear un punto y ver el
Perfil sí requieren sesión iniciada.

## 🗺️ 6. Mapa de rutas

| Dirección | Pantalla | Acceso | Endpoint |
|---|---|---|---|
| `paltasapp://login` | Login | Pública | `POST /api/login` |
| `paltasapp://puntos` | Catálogo | Pública | `GET /api/puntos-rapido` (cache-first) |
| `paltasapp://puntos/:id` | Detalle | Pública | `GET /api/puntos-interes/:id` |
| `paltasapp://puntos/crear` | Crear punto | Privada (admin) | `POST /api/puntos-interes` |
| `paltasapp://perfil` | Perfil | Privada | — |

Para probar que `DetallePuntoScreen` se reconstruye solo con el `id` de la ruta
(sin pasar por la lista), con la app instalada y el emulador corriendo:
```bash
adb shell am start -a android.intent.action.VIEW -d "paltasapp://puntos/1"
```

Ver también [`docs/contrato-puntos-interes.md`](docs/contrato-puntos-interes.md),
[`docs/privacidad-datos.md`](docs/privacidad-datos.md) y
[`docs/evidencias-checklist.md`](docs/evidencias-checklist.md).