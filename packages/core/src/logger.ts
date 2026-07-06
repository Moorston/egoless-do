// ─── Unified logger ────────────────────────────────────────────────
// Structured console logging with optional Sentry integration.
// Sentry is loaded lazily to prevent Metro/webpack bundling issues.

declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Lazy Sentry bridge — set via `setSentryBridge()` from mobile app startup.
// This avoids @egoless-do/core depending on @sentry/react-native at build time.
let _sentry: {
  captureException?: (error: Error, ctx?: Record<string, unknown>) => void;
  captureMessage?: (msg: string, ctx?: Record<string, unknown>) => void;
  addBreadcrumb?: (category: string, message: string, data?: Record<string, unknown>) => void;
} | null = null;

/** Called once from the mobile app to wire up Sentry reporting. */
export function setSentryBridge(bridge: typeof _sentry): void {
  _sentry = bridge;
}

function logToConsole(level: LogLevel, tag: string, args: unknown[]) {
  const prefix = `[${tag}]`;
  switch (level) {
    case 'debug':
      if (__DEV__) console.log(prefix, ...args);
      break;
    case 'info':
      if (__DEV__) console.log(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    case 'error':
      console.error(prefix, ...args);
      break;
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (error: unknown, context?: Record<string, unknown>) => void;
}

export function createLogger(tag: string): Logger {
  return {
    debug(...args: unknown[]) {
      logToConsole('debug', tag, args);
    },
    info(...args: unknown[]) {
      logToConsole('info', tag, args);
      // Add breadcrumb for info-level events (traces user actions)
      _sentry?.addBreadcrumb?.(tag, args.map(String).join(' '));
    },
    warn(...args: unknown[]) {
      logToConsole('warn', tag, args);
      // Report warnings to Sentry as messages
      _sentry?.captureMessage?.(`[${tag}] ${args.map(String).join(' ')}`);
    },
    error(error: unknown, context?: Record<string, unknown>) {
      logToConsole('error', tag, [error, context ?? '']);
      // Report errors to Sentry as exceptions
      const errObj = error instanceof Error ? error : new Error(String(error));
      _sentry?.captureException?.(errObj, context ? { tag, ...context } : { tag });
    },
  };
}
