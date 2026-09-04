import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AppTabsParamList } from './types';
import { CatalogoStack } from './CatalogoStack';
import { PerfilScreen } from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Catalogo" component={CatalogoStack} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
