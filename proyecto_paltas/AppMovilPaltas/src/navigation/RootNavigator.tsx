import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AppTabs } from './AppTabs';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Catálogo y detalle quedan públicos (accesibles sin sesión) a propósito: la
// protección real de CrearPunto/Perfil ocurre DENTRO de esas pantallas vía
// RequireAuth, no ocultando todo el árbol detrás de un gate Auth/App.
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppTabs" component={AppTabs} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: 'modal', headerShown: true, title: 'Iniciar sesión' }}
      />
    </Stack.Navigator>
  );
}
