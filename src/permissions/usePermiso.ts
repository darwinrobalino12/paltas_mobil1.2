import { useCallback, useState } from 'react';
import { check, request, openSettings, RESULTS, Permission } from 'react-native-permissions';
import { confirmarConUsuario } from './rationale';
import { EstadoPermiso } from './types';

// Traduce el resultado de react-native-permissions (que ya es igual en Android
// e iOS) a nuestros 4 estados. LIMITED existe en iOS para fotos parciales, acá
// lo tratamos como "concedido" porque para cámara/ubicación no se usa.
function mapearResultado(resultado: string): EstadoPermiso {
  switch (resultado) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'concedido';
    case RESULTS.BLOCKED:
      return 'denegado_permanente';
    case RESULTS.UNAVAILABLE:
      return 'no_disponible';
    default:
      return 'denegado';
  }
}

export interface UsePermisoResultado {
  estado: EstadoPermiso;
  // Comprueba el estado actual SIN mostrar ningún diálogo. Se debe llamar
  // antes de cada uso de la capacidad (cámara, ubicación...), nunca asumir
  // que un permiso concedido una vez sigue concedido siempre.
  verificar: () => Promise<EstadoPermiso>;
  // Flujo completo: primero la pantalla de justificación (rationale) propia
  // de la app, y solo si el usuario acepta, el diálogo nativo del sistema.
  solicitarConExplicacion: (titulo: string, mensaje: string) => Promise<EstadoPermiso>;
  // Para el caso "denegado_permanente": lleva al usuario a Ajustes del sistema
  // porque desde la app ya no se puede volver a mostrar el diálogo nativo.
  abrirAjustes: () => Promise<void>;
}

export function usePermiso(permiso: Permission): UsePermisoResultado {
  const [estado, setEstado] = useState<EstadoPermiso>('denegado');

  const verificar = useCallback(async () => {
    const resultado = await check(permiso);
    const nuevoEstado = mapearResultado(resultado);
    setEstado(nuevoEstado);
    return nuevoEstado;
  }, [permiso]);

  const solicitarConExplicacion = useCallback(
    async (titulo: string, mensaje: string) => {
      const aceptaVerRationale = await confirmarConUsuario(titulo, mensaje);
      if (!aceptaVerRationale) {
        return 'denegado' as EstadoPermiso;
      }
      const resultado = await request(permiso);
      const nuevoEstado = mapearResultado(resultado);
      setEstado(nuevoEstado);
      return nuevoEstado;
    },
    [permiso]
  );

  const abrirAjustes = useCallback(async () => {
    await openSettings();
  }, []);

  return { estado, verificar, solicitarConExplicacion, abrirAjustes };
}
