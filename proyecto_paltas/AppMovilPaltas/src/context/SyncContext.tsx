import React, { createContext, useContext } from 'react';
import { useNetworkSync, NetworkSyncState } from '../sync/useNetworkSync';

const SyncContext = createContext<NetworkSyncState | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const value = useNetworkSync();
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): NetworkSyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync debe usarse dentro de <SyncProvider>');
  }
  return ctx;
}
