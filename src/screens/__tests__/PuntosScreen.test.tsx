import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PuntosScreen } from '../PuntosScreen';

// PuntosScreen recibe navigation/route por props (no usa useNavigation()), así
// que no hace falta envolver en NavigationContainer — un jest.fn() alcanza.
const navigation = { navigate: jest.fn() } as any;

jest.mock('../../context/SyncContext', () => ({
  useSync: () => ({ pendingCount: 0 }),
}));

// Este es el "origen de datos falso" que pide el enunciado, aprovechando el
// repositorio de la Semana 13: la pantalla solo conoce sincronizarPuntos(),
// así que sustituirlo alcanza para controlar los 4 estados de la UI.
jest.mock('../../storage/sqlite/puntosRepository');
import { sincronizarPuntos } from '../../storage/sqlite/puntosRepository';
const sincronizarPuntosMock = sincronizarPuntos as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe('PuntosScreen — los 4 estados', () => {
  it('loading: mientras la promesa no resuelve, se ve el indicador de carga', async () => {
    sincronizarPuntosMock.mockReturnValue(new Promise(() => {})); // nunca resuelve

    await render(<PuntosScreen navigation={navigation} route={{} as any} />);

    expect(screen.getByTestId('async-state-loading')).toBeOnTheScreen();
  });

  it('con datos: la lista muestra los puntos recibidos', async () => {
    sincronizarPuntosMock.mockResolvedValue({
      puntos: [
        {
          id: '1',
          nombre: 'Mirador El Shiriculapo',
          descripcion: null,
          categoriaId: 1,
          categoriaNombre: 'Natural',
          serverUpdatedAt: null,
          pendingSync: false,
          latitud: null,
          longitud: null,
          imagenUrl: null,
        },
      ],
      cacheVencida: false,
      ultimaSincronizacion: null,
    });

    await render(<PuntosScreen navigation={navigation} route={{} as any} />);

    await waitFor(() => expect(screen.getByText('Mirador El Shiriculapo')).toBeOnTheScreen());
    expect(screen.queryByTestId('async-state-empty')).not.toBeOnTheScreen();
  });

  it('vacío: sin puntos, se ve el mensaje de "no hay registros"', async () => {
    sincronizarPuntosMock.mockResolvedValue({ puntos: [], cacheVencida: false, ultimaSincronizacion: null });

    await render(<PuntosScreen navigation={navigation} route={{} as any} />);

    await waitFor(() => expect(screen.getByTestId('async-state-empty')).toBeOnTheScreen());
  });

  it('error: si sincronizarPuntos rechaza, se ve el estado de error con botón de reintentar', async () => {
    sincronizarPuntosMock.mockRejectedValue(new Error('falló la red'));

    await render(<PuntosScreen navigation={navigation} route={{} as any} />);

    await waitFor(() => expect(screen.getByTestId('async-state-error')).toBeOnTheScreen());
    expect(screen.getByText('No se pudo cargar el catálogo.')).toBeOnTheScreen();

    // "Reintentar Conexión" vuelve a llamar sincronizarPuntos, esta vez forzado.
    sincronizarPuntosMock.mockClear();
    sincronizarPuntosMock.mockResolvedValue({ puntos: [], cacheVencida: false, ultimaSincronizacion: null });
    fireEvent.press(screen.getByText('Reintentar Conexión'));

    await waitFor(() => expect(sincronizarPuntosMock).toHaveBeenCalledWith(true));
  });
});
