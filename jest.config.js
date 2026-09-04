module.exports = {
  preset: '@react-native/jest-preset',
  // proyecto_paltas/ contiene una copia duplicada del proyecto (ver tsconfig.json,
  // que ya la excluye del build) — aquí se excluye también para que Jest no la
  // recorra ni choque con el package.json real de la raíz.
  modulePathIgnorePatterns: ['<rootDir>/proyecto_paltas/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/proyecto_paltas/'],
  // Los paquetes de React Navigation y el ecosistema RN se publican como ESM sin
  // transpilar; hay que permitir que Babel los transforme en vez de ignorarlos.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*)/)',
  ],
};
