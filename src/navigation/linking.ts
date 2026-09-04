import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Mapa de rutas -> dirección. `puntos/:id` es lo que permite reconstruir
// DetallePuntoScreen entrando directo por deep link, sin pasar por la lista.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['paltasapp://'],
  config: {
    screens: {
      Login: 'login',
      AppTabs: {
        screens: {
          Catalogo: {
            screens: {
              ListaPuntos: 'puntos',
              DetallePunto: 'puntos/:id',
              CrearPunto: 'puntos/crear',
            },
          },
          Perfil: 'perfil',
        },
      },
    },
  },
};
