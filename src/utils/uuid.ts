import uuid from 'react-native-uuid';

// Único punto de import de la librería de UUID: si más adelante se confirma
// soporte estable de crypto.randomUUID() en Hermes, el cambio queda aislado aquí.
export function generarUuid(): string {
  return uuid.v4() as string;
}
