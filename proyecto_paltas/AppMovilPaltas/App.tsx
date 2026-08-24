import React from 'react';

import {
  StatusBar,
} from 'react-native';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { PuntosScreen } from './src/screens/PuntosScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />

      <PuntosScreen />
    </SafeAreaProvider>
  );
}

export default App;