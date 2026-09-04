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

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() =>
    Promise.resolve({
      executeSql: jest.fn(() =>
        Promise.resolve([{ rows: { length: 0, item: () => null } }])
      ),
      transaction: jest.fn(scope => {
        scope({ executeSql: jest.fn() });
        return Promise.resolve();
      }),
    })
  ),
}));
