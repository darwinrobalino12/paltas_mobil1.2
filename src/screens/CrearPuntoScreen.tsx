import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView, Image, Alert, Platform, Linking } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import type { CatalogoStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { AppButton } from '../components/AppButton';
import { RequireAuth } from '../navigation/RequireAuth';
import { crearPunto, crearPuntoConFoto } from '../api/puntos';
import { ApiError } from '../api/client';
import { traducirError } from '../api/errors';
import { listarCategoriasLocales, sincronizarCategorias, CategoriaLocal } from '../storage/sqlite/categoriasRepository';
import { insertarPuntoPendiente } from '../storage/sqlite/puntosRepository';
import { encolarOperacion } from '../storage/sqlite/outboxRepository';
import { generarUuid } from '../utils/uuid';
import { useSync } from '../context/SyncContext';
import { reglasNombre, reglasDescripcion, reglasCategoriaId } from '../validation/puntoInteres';
import { usePermiso } from '../permissions/usePermiso';
import { PERMISO_UBICACION, PERMISO_CAMARA } from '../permissions/permisosConfig';
import { EstadoPermiso } from '../permissions/types';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'CrearPunto'>;

interface FormValues {
  nombre: string;
  descripcion: string;
  categoriaId: string;
}

interface Ubicacion {
  latitud: number;
  longitud: number;
}

// El GPS del dispositivo está aparte del permiso: se puede tener el permiso
// concedido y aun así tener el GPS apagado. Como React Native no expone un
// switch directo para eso, lo detectamos por el código de error que devuelve
// Geolocation (2 = POSITION_UNAVAILABLE) y ofrecemos abrir la pantalla de
// ajustes de ubicación del sistema.
function abrirAjustesUbicacionDispositivo() {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
  } else {
    // iOS no tiene un deep-link al toggle de "Localización"; se abre Ajustes.
    Linking.openURL('app-settings:');
  }
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
  const [foto, setFoto] = useState<Asset | null>(null);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const { isOnline, refrescarContador } = useSync();
  const permisoUbicacion = usePermiso(PERMISO_UBICACION);
  const permisoCamara = usePermiso(PERMISO_CAMARA);

  useEffect(() => {
    (async () => {
      setCategorias(await listarCategoriasLocales()); // cache-first para el picker
      setCategorias(await sincronizarCategorias());
    })();
  }, []);

  // Tomar la foto SÍ necesita permiso de cámara; elegir de la galería usa el
  // selector nativo del sistema (Photo Picker en Android, PHPicker en iOS) y
  // por eso no pide ningún permiso — no lo tocamos.
  const tomarFoto = async () => {
    setMensajeError(null);
    let estado: EstadoPermiso = await permisoCamara.verificar();

    if (estado === 'no_disponible') {
      Alert.alert('Cámara no disponible', 'Este dispositivo no tiene cámara disponible.');
      return;
    }

    if (estado === 'denegado_permanente') {
      Alert.alert(
        'Permiso bloqueado',
        'Denegaste el permiso de cámara y elegiste "no volver a preguntar". Actívalo desde los Ajustes del sistema para tomar la foto.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => permisoCamara.abrirAjustes() },
        ]
      );
      return;
    }

    if (estado === 'denegado') {
      estado = await permisoCamara.solicitarConExplicacion(
        'Foto del punto de interés',
        'Necesitamos acceso a la cámara para tomar la foto de este punto de interés.'
      );
    }

    if (estado !== 'concedido') {
      setMensajeError('Permiso de cámara denegado. No se pudo tomar la foto.');
      return;
    }

    const resultado = await launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: true });
    const asset = resultado.assets?.[0];
    if (asset?.uri) setFoto(asset);
  };

  const elegirDeGaleria = async () => {
    const resultado = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    const asset = resultado.assets?.[0];
    if (asset?.uri) setFoto(asset);
  };

  const elegirFoto = () => {
    Alert.alert('Agregar foto', '¿Cómo quieres agregar la foto?', [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirDeGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const obtenerUbicacionActual = async () => {
    setMensajeError(null);
    let estado: EstadoPermiso = await permisoUbicacion.verificar();

    if (estado === 'no_disponible') {
      setMensajeError('Este dispositivo no tiene servicio de ubicación disponible.');
      return;
    }

    if (estado === 'denegado_permanente') {
      Alert.alert(
        'Permiso bloqueado',
        'Denegaste el permiso de ubicación y elegiste "no volver a preguntar". Actívalo desde los Ajustes del sistema para usar tu posición actual.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => permisoUbicacion.abrirAjustes() },
        ]
      );
      return;
    }

    if (estado === 'denegado') {
      estado = await permisoUbicacion.solicitarConExplicacion(
        'Ubicación del punto de interés',
        'Necesitamos tu ubicación mientras usas la app para guardar las coordenadas exactas de este punto de interés.'
      );
    }

    if (estado !== 'concedido') {
      setMensajeError('Permiso de ubicación denegado. No se pudo obtener tu posición.');
      return;
    }

    setBuscandoUbicacion(true);
    Geolocation.getCurrentPosition(
      posicion => {
        setUbicacion({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
        setBuscandoUbicacion(false);
      },
      error => {
        setBuscandoUbicacion(false);
        if (error.code === 2) {
          // POSITION_UNAVAILABLE: normalmente significa que el GPS está apagado,
          // no que falte el permiso (eso ya se validó arriba).
          Alert.alert(
            'GPS desactivado',
            'No pudimos obtener tu posición. Verifica que el GPS de tu dispositivo esté activado.',
            [
              { text: 'Cerrar', style: 'cancel' },
              { text: 'Abrir ajustes de ubicación', onPress: abrirAjustesUbicacionDispositivo },
            ]
          );
        } else {
          setMensajeError('No se pudo obtener tu ubicación. Intenta de nuevo.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const onSubmit = async (values: FormValues) => {
    setMensajeExito(null);
    setMensajeError(null);

    const categoriaId = Number(values.categoriaId);
    const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
    const payload = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || undefined,
      categoriaId,
      ...(ubicacion ? { latitud: ubicacion.latitud, longitud: ubicacion.longitud } : {}),
    };

    if (!isOnline) {
      // Offline: se guarda de forma optimista en SQLite y se encola en el outbox;
      // el id de la operación viaja luego como Idempotency-Key al reintentar.
      // La foto no viaja por este camino (requiere conexión), solo las coordenadas GPS.
      const localId = `local-${generarUuid()}`;
      await insertarPuntoPendiente({
        localId,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        categoriaId,
        categoriaNombre: categoriaSeleccionada?.nombre || 'General',
        latitud: ubicacion?.latitud,
        longitud: ubicacion?.longitud,
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
      if (foto) {
        await crearPuntoConFoto(payload, foto.uri as string, generarUuid());
      } else {
        await crearPunto(payload, generarUuid());
      }
      setMensajeExito('Punto de interés creado con éxito.');
      setTimeout(() => navigation.navigate('ListaPuntos'), 800);
    } catch (error) {
      // El 422 (datos inválidos por campo) es específico de este formulario:
      // se traduce a errores debajo de cada input, no a un mensaje genérico.
      if (error instanceof ApiError && error.status === 422) {
        const cuerpo = error.body as { errors?: Array<{ field: string; message: string }> };
        cuerpo.errors?.forEach(e => {
          if (e.field === 'nombre' || e.field === 'descripcion' || e.field === 'categoriaId') {
            setError(e.field, { type: 'server', message: e.message });
          }
        });
        return;
      }
      // Todo lo demás (sin conexión, tiempo agotado, error de servidor, 401,
      // 403, etc.) usa el traductor común de las 4 familias de fallo.
      setMensajeError(traducirError(error));
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

      <Text style={styles.label}>Foto (opcional)</Text>
      {foto?.uri && <Image source={{ uri: foto.uri }} style={styles.previewFoto} />}
      <AppButton
        title={foto ? 'Cambiar foto' : 'Agregar foto'}
        onPress={elegirFoto}
        disabled={!isOnline}
      />
      {!isOnline && <Text style={styles.aviso}>La foto requiere conexión a internet.</Text>}

      <Text style={styles.label}>Ubicación (opcional)</Text>
      {ubicacion && (
        <Text style={styles.ubicacionTexto}>
          📍 {ubicacion.latitud.toFixed(6)}, {ubicacion.longitud.toFixed(6)}
        </Text>
      )}
      <AppButton
        title={buscandoUbicacion ? 'Obteniendo ubicación...' : ubicacion ? 'Actualizar mi ubicación' : 'Usar mi ubicación actual'}
        onPress={obtenerUbicacionActual}
        disabled={buscandoUbicacion}
      />

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
  previewFoto: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  ubicacionTexto: { fontSize: 14, color: theme.colors.text, marginBottom: theme.spacing.xs },
  error: { color: theme.colors.error, marginTop: theme.spacing.xs },
  exito: { color: theme.colors.success, marginTop: theme.spacing.sm },
  aviso: { color: theme.colors.warning, marginTop: theme.spacing.sm },
});
