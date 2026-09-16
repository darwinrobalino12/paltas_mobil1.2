import { Alert } from 'react-native';

// Muestra la pantalla de justificación (rationale) ANTES del diálogo nativo
// del sistema operativo. Es la explicación en "nuestras palabras" de por qué
// se necesita el permiso; el diálogo del sistema (con sus botones "Permitir"/
// "Denegar") viene después, solo si el usuario acepta acá.
export function confirmarConUsuario(titulo: string, mensaje: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continuar', onPress: () => resolve(true) },
    ]);
  });
}
