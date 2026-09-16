import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { procesarOutbox } from './processOutbox';
import { contarPendientes } from '../storage/sqlite/outboxRepository';
import { notificarSincronizacion } from '../notifications/notificationService';

export interface NetworkSyncState {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  sincronizarAhora: () => Promise<void>;
  refrescarContador: () => Promise<void>;
}

// Dispara el vaciado del outbox al recuperar la conexión, y mantiene el contador
// de pendientes que consumen PerfilScreen y el banner de ListaPuntosScreen.
export function useNetworkSync(): NetworkSyncState {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const eraOffline = useRef(false);

  const refrescarContador = useCallback(async () => {
    setPendingCount(await contarPendientes());
  }, []);

  const sincronizarAhora = useCallback(async () => {
    setSyncing(true);
    try {
      const pendientesAntes = await contarPendientes();
      await procesarOutbox();
      const pendientesDespues = await contarPendientes();
      // Avisa solo si de verdad se completó algo (evita notificar "0 pendientes"
      // cada vez que se abre la app o se reconecta sin nada en la cola).
      if (pendientesDespues < pendientesAntes) {
        const enviados = pendientesAntes - pendientesDespues;
        await notificarSincronizacion(
          `Se sincronizaron ${enviados} punto(s) de interés pendiente(s).`
        );
      }
    } finally {
      await refrescarContador();
      setSyncing(false);
    }
  }, [refrescarContador]);

  useEffect(() => {
    let primerChequeo = true;

    const unsubscribe = NetInfo.addEventListener(state => {
      const conectado = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(conectado);

      // Sincroniza al reconectar (offline -> online) y también la primera vez
      // que se conoce el estado de red al abrir la app, sin depender de un
      // temporizador ni de polling periódico.
      if (conectado && (eraOffline.current || primerChequeo)) {
        sincronizarAhora();
      } else if (primerChequeo) {
        refrescarContador();
      }

      eraOffline.current = !conectado;
      primerChequeo = false;
    });

    return unsubscribe;
  }, [refrescarContador, sincronizarAhora]);

  return { isOnline, pendingCount, syncing, sincronizarAhora, refrescarContador };
}
