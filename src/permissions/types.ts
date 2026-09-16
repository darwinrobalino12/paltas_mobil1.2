// Los 4 estados posibles de un permiso nativo (cámara, ubicación, notificaciones...).
// Cualquier pantalla que pida un permiso debe saber reaccionar a los 4, sin excepción,
// para que la app nunca se quede bloqueada ni se cierre.
export type EstadoPermiso =
  | 'concedido' // el usuario dijo que sí, se puede usar la capacidad
  | 'denegado' // el usuario dijo que no, pero se le puede volver a preguntar
  | 'denegado_permanente' // el usuario dijo que no y marcó "no volver a preguntar" (o iOS ya preguntó una vez)
  | 'no_disponible'; // el dispositivo no tiene esa capacidad (ej. sin GPS) o el permiso no existe en esta plataforma
