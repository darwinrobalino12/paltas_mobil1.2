// Tipo cerrado (unión discriminada) para el estado de una operación remota.
// Los cuatro casos son mutuamente excluyentes: en cualquier momento el estado
// solo puede estar en uno de ellos, y TypeScript obliga a comprobar `status`
// antes de poder leer `data` o `error`.
export type RemoteState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

export const remoteIdle = <T>(): RemoteState<T> => ({ status: 'idle' });
export const remoteLoading = <T>(): RemoteState<T> => ({ status: 'loading' });
export const remoteSuccess = <T>(data: T): RemoteState<T> => ({ status: 'success', data });
export const remoteError = <T>(error: string): RemoteState<T> => ({ status: 'error', error });

interface AsyncViewProps {
  status: 'loading' | 'error' | 'empty' | 'success';
  errorMessage?: string;
}

// Adapta RemoteState<T> a las props que ya acepta AsyncStateView, sin modificar ese componente.
export function toAsyncViewProps<T extends { length: number }>(remote: RemoteState<T>): AsyncViewProps {
  if (remote.status === 'idle' || remote.status === 'loading') {
    return { status: 'loading' };
  }
  if (remote.status === 'error') {
    return { status: 'error', errorMessage: remote.error };
  }
  return { status: remote.data.length === 0 ? 'empty' : 'success' };
}
