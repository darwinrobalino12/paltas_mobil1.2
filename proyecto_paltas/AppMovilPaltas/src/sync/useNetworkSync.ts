import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { procesarOutbox } from './processOutbox';
import { contarPendientes } from '../storage/sqlite/outboxRepository';

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
      await procesarOutbox();
    } finally {
      await refrescarContador();
      setSyncing(false);
    }
  }, [refrescarContador]);

  useEffect(() => {
    refrescarContador();

    const unsubscribe = NetInfo.addEventListener(state => {
      const conectado = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(conectado);

      if (conectado && eraOffline.current) {
        sincronizarAhora();
      }
      eraOffline.current = !conectado;
    });

    return unsubscribe;
  }, [refrescarContador, sincronizarAhora]);

  return { isOnline, pendingCount, syncing, sincronizarAhora, refrescarContador };
}
