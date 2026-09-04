import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CatalogoStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { AppButton } from '../components/AppButton';
import { RequireAuth } from '../navigation/RequireAuth';
import { crearPunto } from '../api/puntos';
import { ApiError } from '../api/client';
import { listarCategoriasLocales, sincronizarCategorias, CategoriaLocal } from '../storage/sqlite/categoriasRepository';
import { insertarPuntoPendiente } from '../storage/sqlite/puntosRepository';
import { encolarOperacion } from '../storage/sqlite/outboxRepository';
import { generarUuid } from '../utils/uuid';
import { useSync } from '../context/SyncContext';
import { reglasNombre, reglasDescripcion, reglasCategoriaId } from '../validation/puntoInteres';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'CrearPunto'>;

interface FormValues {
  nombre: string;
  descripcion: string;
  categoriaId: string;
}

function CrearPuntoForm({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: 'onBlur', defaultValues: { nombre: '', descripcion: '', categoriaId: '' } });

  const [categorias, setCategorias] = useState<CategoriaLocal[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const { isOnline, refrescarContador } = useSync();

  useEffect(() => {
    (async () => {
      setCategorias(await listarCategoriasLocales()); // cache-first para el picker
      setCategorias(await sincronizarCategorias());
    })();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setMensajeExito(null);
    setMensajeError(null);

    const categoriaId = Number(values.categoriaId);
    const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
    const payload = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || undefined,
      categoriaId,
    };

    if (!isOnline) {
      // Offline: se guarda de forma optimista en SQLite y se encola en el outbox;
      // el id de la operación viaja luego como Idempotency-Key al reintentar.
      const localId = `local-${generarUuid()}`;
      await insertarPuntoPendiente({
        localId,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        categoriaId,
        categoriaNombre: categoriaSeleccionada?.nombre || 'General',
      });
      await encolarOperacion({
        id: generarUuid(),
        entity: 'punto_interes',
        operation: 'create',
        payload,
        targetLocalId: localId,
      });
      await refrescarContador();
      setMensajeExito('Sin conexión: el punto se guardó localmente y se enviará automáticamente al reconectar.');
      return;
    }

    try {
      await crearPunto(payload, generarUuid());
      setMensajeExito('Punto de interés creado con éxito.');
      setTimeout(() => navigation.navigate('ListaPuntos'), 800);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const cuerpo = error.body as { errors?: Array<{ field: string; message: string }> };
        cuerpo.errors?.forEach(e => {
          if (e.field === 'nombre' || e.field === 'descripcion' || e.field === 'categoriaId') {
            setError(e.field, { type: 'server', message: e.message });
          }
        });
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        // El cliente ya intentó refrescar el token una vez (ver api/client.ts).
        // Si sigue en 401, la sesión expiró de verdad.
        setMensajeError('Tu sesión expiró. Vuelve a iniciar sesión desde la pestaña Perfil.');
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        // 403 NO redirige a Login: el usuario sigue autenticado, solo no tiene el rol.
        setMensajeError('No tienes permiso para crear puntos de interés.');
        return;
      }
      setMensajeError('No se pudo crear el punto de interés. Intenta de nuevo.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Nuevo punto de interés</Text>

      <Text style={styles.label}>Nombre</Text>
      <Controller
        control={control}
        name="nombre"
        rules={reglasNombre}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Ej. Mirador El Shiriculapo"
          />
        )}
      />
      {errors.nombre && <Text style={styles.error}>{errors.nombre.message}</Text>}

      <Text style={styles.label}>Descripción (opcional)</Text>
      <Controller
        control={control}
        name="descripcion"
        rules={reglasDescripcion}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Describe brevemente el lugar"
            multiline
          />
        )}
      />
      {errors.descripcion && <Text style={styles.error}>{errors.descripcion.message}</Text>}

      <Text style={styles.label}>Categoría</Text>
      <Controller
        control={control}
        name="categoriaId"
        rules={reglasCategoriaId}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.categoriasContenedor}>
            {categorias.map(categoria => (
              <View key={categoria.id} style={styles.categoriaBoton}>
                <AppButton
                  title={value === String(categoria.id) ? `✓ ${categoria.nombre}` : categoria.nombre}
                  onPress={() => {
                    onChange(String(categoria.id));
                    onBlur();
                  }}
                />
              </View>
            ))}
          </View>
        )}
      />
      {errors.categoriaId && <Text style={styles.error}>{errors.categoriaId.message}</Text>}

      {!isOnline && <Text style={styles.aviso}>Sin conexión: el punto se guardará y sincronizará después.</Text>}
      {mensajeExito && <Text style={styles.exito}>{mensajeExito}</Text>}
      {mensajeError && <Text style={styles.error}>{mensajeError}</Text>}

      <AppButton
        title={isSubmitting ? 'Guardando...' : 'Guardar punto de interés'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </ScrollView>
  );
}

export const CrearPuntoScreen = (props: Props) => (
  <RequireAuth rolesPermitidos={['admin']}>
    <CrearPuntoForm {...props} />
  </RequireAuth>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  label: { fontSize: 14, color: theme.colors.text, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  categoriasContenedor: { marginTop: theme.spacing.xs },
  categoriaBoton: { marginBottom: theme.spacing.xs },
  error: { color: theme.colors.error, marginTop: theme.spacing.xs },
  exito: { color: theme.colors.success, marginTop: theme.spacing.sm },
  aviso: { color: theme.colors.warning, marginTop: theme.spacing.sm },
});
