import React from 'react';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';

enableScreens();

function App(): React.JSX.Element {
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
