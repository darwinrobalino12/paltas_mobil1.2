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
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@notifee/.*|@testing-library/.*|test-renderer|@sentry/.*)/)',
  ],
  // El SDK de Sentry registra listeners nativos (AppState, conectividad, etc.)
  // en cuanto se importa, incluso sin llamar a Sentry.init() — bajo Jest eso
  // deja handles abiertos que impiden que el proceso termine solo. forceExit
  // es la salida recomendada para este caso (no es un leak de nuestro código).
  forceExit: true,
};
