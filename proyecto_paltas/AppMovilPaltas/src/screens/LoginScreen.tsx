import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { theme } from '../theme';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

interface FormValues {
  username: string;
  password: string;
}

export const LoginScreen = ({ navigation }: Props) => {
  const { login, consumirDestinoPendiente } = useAuth();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: 'onBlur', defaultValues: { username: '', password: '' } });

  // Conserva el destino pretendido: si el login vino de un redirect de RequireAuth,
  // vuelve exactamente a esa pantalla en vez de mandar siempre al catálogo.
  const irADestinoTrasLogin = () => {
    const destino = consumirDestinoPendiente();
    if (destino?.name === 'CrearPunto') {
      navigation.navigate('AppTabs', { screen: 'Catalogo', params: { screen: 'CrearPunto' } });
      return;
    }
    if (destino?.name === 'Perfil') {
      navigation.navigate('AppTabs', { screen: 'Perfil' });
      return;
    }
    navigation.navigate('AppTabs', { screen: 'Catalogo', params: { screen: 'ListaPuntos' } });
  };

  const onSubmit = async (values: FormValues) => {
    setErrorGeneral(null);
    try {
      await login(values.username.trim(), values.password);
      irADestinoTrasLogin();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorGeneral('Usuario o contraseña incorrectos.');
      } else if (error instanceof ApiError && error.status === 422) {
        const cuerpo = error.body as { errors?: Array<{ field: string; message: string }> };
        setErrorGeneral(cuerpo.errors?.map(e => e.message).join(' ') || 'Revisa los datos ingresados.');
      } else {
        setErrorGeneral('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Iniciar sesión</Text>
      <Text style={styles.subtitulo}>Taller Paltas</Text>

      <Text style={styles.label}>Usuario</Text>
      <Controller
        control={control}
        name="username"
        rules={{ required: 'El usuario es obligatorio.' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            placeholder="petri"
          />
        )}
      />
      {errors.username && <Text style={styles.error}>{errors.username.message}</Text>}

      <Text style={styles.label}>Contraseña</Text>
      <Controller
        control={control}
        name="password"
        rules={{ required: 'La contraseña es obligatoria.' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            placeholder="••••••••"
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      {errorGeneral && <Text style={styles.error}>{errorGeneral}</Text>}

      <AppButton title={isSubmitting ? 'Ingresando...' : 'Ingresar'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
      <AppButton
        title="Ver catálogo sin iniciar sesión"
        onPress={() => navigation.navigate('AppTabs', { screen: 'Catalogo', params: { screen: 'ListaPuntos' } })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  label: { fontSize: 14, color: theme.colors.text, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  error: { color: theme.colors.error, marginTop: theme.spacing.xs },
});
