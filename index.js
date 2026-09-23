/**
 * @format
 */

// Debe ser el primer import del entry point (lo exige react-native-gesture-handler,
// requerido por React Navigation).
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import * as Sentry from '@sentry/react-native';
import App from './App';
import { name as appName } from './app.json';
import { version as appVersion } from './package.json';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './src/config/monitoring';
import { sanitizarContexto } from './src/utils/logger';

// Monitoreo de fallos (Semana 15). tracesSampleRate: 0 porque esta entrega
// solo cubre monitoreo de errores, no de performance — no tiene sentido
// gastar cuota gratuita en algo que todavía no se está mirando.
//
// beforeSend es el filtro de privacidad (punto 21 del enunciado): nunca debe
// salir de este dispositivo el header Authorization real, ni ningún dato de
// los breadcrumbs que sanitizarContexto() no haya limpiado ya.
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  debug: __DEV__,
  tracesSampleRate: 0,
  release: `AppMovilPaltas@${appVersion}`,
  beforeSend(event) {
    if (event.request?.headers?.Authorization) {
      event.request.headers.Authorization = '[OCULTO]';
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
        ...breadcrumb,
        data: sanitizarContexto(breadcrumb.data),
      }));
    }
    return event;
  },
});

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
