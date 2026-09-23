import {
  remoteIdle,
  remoteLoading,
  remoteSuccess,
  remoteError,
  toAsyncViewProps,
} from '../remoteState';

describe('remoteState — constructores', () => {
  it('remoteIdle produce el estado idle', () => {
    expect(remoteIdle()).toEqual({ status: 'idle' });
  });

  it('remoteLoading produce el estado loading', () => {
    expect(remoteLoading()).toEqual({ status: 'loading' });
  });

  it('remoteSuccess guarda los datos recibidos', () => {
    expect(remoteSuccess([1, 2, 3])).toEqual({ status: 'success', data: [1, 2, 3] });
  });

  it('remoteError guarda el mensaje recibido', () => {
    expect(remoteError('algo salió mal')).toEqual({ status: 'error', error: 'algo salió mal' });
  });
});

// Esta es la función que decide cuál de los 4 estados de pantalla se muestra
// (PuntosScreen.tsx la usa directo) — es la pieza de lógica más importante a
// cubrir de este archivo.
describe('toAsyncViewProps — los 4 estados de pantalla', () => {
  it('idle se muestra como loading', () => {
    expect(toAsyncViewProps(remoteIdle<number[]>())).toEqual({ status: 'loading' });
  });

  it('loading se muestra como loading', () => {
    expect(toAsyncViewProps(remoteLoading<number[]>())).toEqual({ status: 'loading' });
  });

  it('error se muestra como error, con el mensaje original', () => {
    expect(toAsyncViewProps(remoteError<number[]>('no se pudo cargar'))).toEqual({
      status: 'error',
      errorMessage: 'no se pudo cargar',
    });
  });

  it('success con lista vacía se muestra como empty', () => {
    expect(toAsyncViewProps(remoteSuccess<number[]>([]))).toEqual({ status: 'empty' });
  });

  it('success con datos se muestra como success', () => {
    expect(toAsyncViewProps(remoteSuccess<number[]>([1]))).toEqual({ status: 'success' });
  });
});
