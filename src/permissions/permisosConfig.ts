import { Platform } from 'react-native';
import { PERMISSIONS, Permission } from 'react-native-permissions';

// Un solo permiso nativo por capacidad, elegido según la plataforma.
// Así el resto del código pide "el permiso de ubicación" sin preocuparse
// de si corre en Android o en iOS.
export const PERMISO_UBICACION: Permission = Platform.select({
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
})!;

export const PERMISO_CAMARA: Permission = Platform.select({
  android: PERMISSIONS.ANDROID.CAMERA,
  ios: PERMISSIONS.IOS.CAMERA,
})!;
