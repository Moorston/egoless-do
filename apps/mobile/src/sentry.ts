// ─── Sentry configuration ────────────────────────────────────────
// Initializes Sentry for crash reporting, breadcrumbs, and performance monitoring.
// All logger.error/logger.warn calls in the app automatically flow through here.

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

/**
 * Initialize Sentry. Call once at app startup.
 * No-op if SENTRY_DSN is not configured (staging/development).
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    // No DSN configured — Sentry stays inactive.
    // This is expected in development and local builds.
    return;
  }

  const release = Constants.expoConfig?.version ?? 'unknown';
  const environment = __DEV__ ? 'development' : 'production';

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    release,
    // Use the server-side tunnel to bypass ad blockers.
    // The tunnel is already configured in infra/nginx.conf → /api/monitoring
    tunnel: '/api/monitoring',
    // Enable performance monitoring (tracing)
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Enable session tracking for crash-free rate
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    // Attach useful context
    attachStacktrace: true,
    // Max breadcrumbs to keep
    maxBreadcrumbs: 50,
    // Ignore known noisy errors
    ignoreErrors: [
      'Network request failed',
      'Load failed',
      'cancelled',
    ],
    // beforeSend: drop sensitive data
    beforeSend(event) {
      // Strip PII from user context — keep only id for crash grouping
      if (event.user) {
        event.user = {
          id: event.user.id ?? event.user.email ?? 'unknown',
        };
      }
      // Strip auth tokens from breadcrumbs if any leaked
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => {
          if (b.data && typeof b.data === 'object') {
            const data = { ...b.data };
            for (const key of Object.keys(data)) {
              if (/token|password|secret/i.test(key)) {
                data[key] = '[Redacted]';
              }
            }
            return { ...b, data };
          }
          return b;
        });
      }
      return event;
    },
  });
}

/**
 * Capture an exception with optional context.
 * Used by createLogger when level === 'error'.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  if (context) {
    Sentry.setContext('extra', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a warning message with optional context.
 * Used by createLogger when level === 'warn'.
 */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  if (context) {
    Sentry.setContext('extra', context);
  }
  Sentry.captureMessage(message, 'warning');
}

/**
 * Add a breadcrumb (info/debug level).
 * Used by createLogger when level === 'info' or 'debug'.
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Set the current user context for Sentry.
 * Call after login with userId and optional email.
 * Only the user id is sent to Sentry — email and name are stripped for privacy.
 */
export function setSentryUser(user: { id: string; email?: string; name?: string }): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: user.id });
}

/**
 * Clear the user context.
 * Call on logout.
 */
export function clearSentryUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}
