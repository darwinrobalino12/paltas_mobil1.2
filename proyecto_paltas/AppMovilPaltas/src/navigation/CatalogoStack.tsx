import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CatalogoStackParamList } from './types';
import { PuntosScreen } from '../screens/PuntosScreen';
import { DetallePuntoScreen } from '../screens/DetallePuntoScreen';
import { CrearPuntoScreen } from '../screens/CrearPuntoScreen';

const Stack = createNativeStackNavigator<CatalogoStackParamList>();

// Navegador anidado (vive dentro de AppTabs, que a su vez vive dentro de RootStack):
// cumple el requisito de al menos una ruta anidada. Permanece montado al cambiar
// de tab (comportamiento por defecto), por eso el formulario de CrearPunto se conserva.
export function CatalogoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ListaPuntos" component={PuntosScreen} options={{ title: 'Puntos de interés' }} />
      <Stack.Screen name="DetallePunto" component={DetallePuntoScreen} options={{ title: 'Detalle' }} />
      <Stack.Screen name="CrearPunto" component={CrearPuntoScreen} options={{ title: 'Nuevo punto' }} />
    </Stack.Navigator>
  );
}
