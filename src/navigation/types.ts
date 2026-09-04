import type { NavigatorScreenParams } from '@react-navigation/native';

export type CatalogoStackParamList = {
  ListaPuntos: undefined;
  DetallePunto: { id: string };
  CrearPunto: undefined;
};

export type AppTabsParamList = {
  Catalogo: NavigatorScreenParams<CatalogoStackParamList>;
  Perfil: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  AppTabs: NavigatorScreenParams<AppTabsParamList>;
};
