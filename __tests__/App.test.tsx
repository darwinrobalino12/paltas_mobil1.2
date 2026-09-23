/**
 * @format
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '../App';

// Evita que el catálogo dispare una llamada de red real al montar: no es lo
// que esta prueba quiere verificar (eso ya lo cubre PuntosScreen.test.tsx),
// solo que la navegación de verdad llega a la pantalla del catálogo.
jest.mock('../src/storage/sqlite/puntosRepository', () => ({
  sincronizarPuntos: jest.fn(() =>
    Promise.resolve({ puntos: [], cacheVencida: false, ultimaSincronizacion: null })
  ),
}));

test('al abrir la app se llega al catálogo de puntos de interés', async () => {
  await render(<App />);

  // Aserción real: no solo "no truena", sino que la navegación (RootNavigator
  // → AppTabs → CatalogoStack) efectivamente renderiza PuntosScreen.
  expect(screen.getByText('Puntos de Interés - Paltas')).toBeOnTheScreen();
});
