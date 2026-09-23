// Configuración de Sentry (monitoreo de fallos), mismo patrón que src/config/api.ts.
//
// SENTRY_DSN: TODO — pegar acá el DSN del proyecto gratuito de Sentry
// (Settings → Client Keys (DSN) en https://sentry.io). Sin un DSN real, Sentry
// simplemente no manda nada (no rompe la app), así que es seguro dejarlo
// como placeholder hasta tener la cuenta creada.
export const SENTRY_DSN = 'https://TU_DSN_AQUI@oXXXXXXX.ingest.us.sentry.io/XXXXXXX';

export const SENTRY_ENVIRONMENT = __DEV__ ? 'development' : 'production';
