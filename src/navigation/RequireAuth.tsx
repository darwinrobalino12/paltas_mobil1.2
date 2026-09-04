import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface RequireAuthProps {
  children: React.ReactNode;
  rolesPermitidos?: Array<'admin' | 'user'>;
}

// Protege pantallas privadas según AuthContext.status. Si no hay sesión, guarda
// el destino pretendido y redirige a Login; tras loguearse, LoginScreen vuelve aquí.
// Usa useFocusEffect (no useEffect) para volver a comprobar la sesión cada vez que
// la pantalla recupera el foco (ej. el usuario vuelve atrás desde Login sin loguearse).
export function RequireAuth({ children, rolesPermitidos }: RequireAuthProps) {
  const { status, usuario, guardarDestinoPendiente } = useAuth();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const route = useRoute();

  useFocusEffect(
    useCallback(() => {
      if (status === 'unauthenticated') {
        guardarDestinoPendiente({
          name: route.name,
          params: route.params as Record<string, unknown> | undefined,
        });
        navigation.navigate('Login');
      }
    }, [status, navigation, route.name, route.params, guardarDestinoPendiente])
  );

  if (status !== 'authenticated' || !usuario) {
    return null;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.titulo}>No tienes permiso</Text>
        <Text style={styles.texto}>
          Tu cuenta ({usuario.rol}) no tiene autorización para acceder a esta sección.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  texto: {
    color: theme.colors.text,
    textAlign: 'center',
  },
});
