import React, { useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';
import { crearCanalSincronizacion } from './src/notifications/notificationService';

enableScreens();

function App(): React.JSX.Element {
  useEffect(() => {
    // Solo crea el canal de notificaciones (obligatorio antes del primer
    // envío). NO pide el permiso acá: eso ocurre en Perfil, cuando el
    // usuario decide activarlo (solicitud justo a tiempo, no al iniciar).
    crearCanalSincronizacion();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <NavigationContainer linking={linking}>
            <RootNavigator />
          </NavigationContainer>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
