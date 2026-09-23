/* eslint-env jest */
// React 19 exige declarar explícitamente que el entorno soporta act() — sin
// esto, cualquier actualización de estado async (como las de las pantallas
// tras un await) dispara warnings de "not configured to support act" aunque
// la prueba pase bien.
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mocks de módulos nativos para que los tests corran bajo Node (Jest), donde no
// existe un puente nativo real. Necesarios porque el proyecto ahora usa NetInfo,
// Keychain y SQLite (todos requieren binarios nativos que solo existen en el dispositivo).

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

// El SQLite real (@op-engineering/op-sqlite, es JSI + C++) se mockea aparte
// en __mocks__/@op-engineering/op-sqlite.ts — Jest lo aplica solo, sin
// necesidad de jest.mock() acá (mock manual a nivel de node_modules).

jest.mock('@notifee/react-native', () => require('@notifee/react-native/jest-mock'));

// Sin esto, SafeAreaProvider nunca "mide" los insets bajo Jest (no hay
// módulo nativo) y no llega a renderizar ningún hijo — toda la app quedaría
// en blanco en cualquier prueba que monte la navegación real. El mock oficial
// solo expone sus componentes bajo `.default`; como App.tsx los importa con
// `import { SafeAreaProvider } from ...` (named import), hay que "aplanarlos"
// también como exports de nivel superior o quedan `undefined`.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return { __esModule: true, ...mock.default, default: mock.default };
});

// react-native-screens no trae mock oficial. El navigator nativo (createNativeStackNavigator,
// el que usa RootNavigator/CatalogoStack) SIEMPRE importa estos componentes — no depende
// de si enableScreens() corrió o no —, así que hay que mockearlos a mano como pass-through
// simples para que la navegación real pueda montarse bajo Jest.
jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  const PassThrough = ({ children, ...props }) => React.createElement(View, props, children);
  return {
    enableScreens: jest.fn(),
    enableFreeze: jest.fn(),
    screensEnabled: jest.fn(() => false),
    compatibilityFlags: {},
    Screen: PassThrough,
    ScreenContainer: PassThrough,
    ScreenStack: PassThrough,
    ScreenStackItem: PassThrough,
    ScreenStackHeaderConfig: PassThrough,
    ScreenStackHeaderSubview: PassThrough,
    ScreenStackHeaderLeftView: PassThrough,
    ScreenStackHeaderRightView: PassThrough,
    ScreenStackHeaderCenterView: PassThrough,
    ScreenStackHeaderBackButtonImage: PassThrough,
    ScreenStackHeaderSearchBarView: PassThrough,
    ScreenFooter: PassThrough,
    SearchBar: PassThrough,
    isSearchBarAvailableForCurrentPlatform: false,
    NativeScreen: PassThrough,
    FullWindowOverlay: PassThrough,
  };
});

jest.mock('react-native-permissions', () => ({
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    BLOCKED: 'blocked',
    DENIED: 'denied',
    GRANTED: 'granted',
    LIMITED: 'limited',
  },
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      CAMERA: 'android.permission.CAMERA',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      CAMERA: 'ios.permission.CAMERA',
    },
  },
  check: jest.fn(),
  request: jest.fn(),
  openSettings: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
