// ─── Sentry configuration ────────────────────────────────────────
// 性能优化：动态 import @sentry/react-native（~350KB 移出首屏）
import Constants from 'expo-constants';

// Expo 环境变量：EXPO_PUBLIC_ 前缀在 .env 中设置，对 JS bundle 可见。
// SENTRY_DSN 是非 Expo 环境（如 EAS 后构建脚本）的 fallback。
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_SENTRY_DSN;

let sentryModule: typeof import('@sentry/react-native') | null = null;

/**
 * 动态加载 Sentry 模块。
 * 首屏后调用，避免阻塞首屏 JS 解析。
 */
async function getSentry() {
  if (!sentryModule) {
    sentryModule = await import('@sentry/react-native');
  }
  return sentryModule;
}

/**
 * Initialize Sentry. Call once at app startup（首屏后）。
 * No-op if SENTRY_DSN is not configured (staging/development).
 */
export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) return;

  const Sentry = await getSentry();
  const release = Constants.expoConfig?.version ?? 'unknown';
  const environment = __DEV__ ? 'development' : 'production';

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    release,
    tunnel: '/api/monitoring',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    ignoreErrors: ['Network request failed', 'Load failed', 'cancelled'],
    beforeSend(event) {
      if (event.user) {
        event.user = { id: event.user.id ?? event.user.email ?? 'unknown' };
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => {
          if (b.data && typeof b.data === 'object') {
            const data = { ...b.data };
            for (const key of Object.keys(data)) {
              if (/token|password|secret/i.test(key)) data[key] = '[Redacted]';
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

export async function captureException(error: Error, context?: Record<string, unknown>): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await getSentry();
  if (context) Sentry.setContext('extra', context);
  Sentry.captureException(error);
}

export async function captureMessage(message: string, context?: Record<string, unknown>): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await getSentry();
  if (context) Sentry.setContext('extra', context);
  Sentry.captureMessage(message, 'warning');
}

export async function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await getSentry();
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

export async function setSentryUser(user: { id: string; email?: string; name?: string }): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await getSentry();
  Sentry.setUser({ id: user.id });
}

export async function clearSentryUser(): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await getSentry();
  Sentry.setUser(null);
}
