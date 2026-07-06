// ─── Unified logger ────────────────────────────────────────────────
// Structured console logging.
// TODO: Re-integrate Sentry via @sentry/react-native for production error tracking.
//       The previous integration was removed due to sentry-expo causing webpack
//       static analysis failures in Next.js builds. When re-adding, use dynamic
//       require to prevent Metro/webpack bundling.

declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    },
    warn(...args: unknown[]) {
      logToConsole('warn', tag, args);
    },
    error(error: unknown, context?: Record<string, unknown>) {
      logToConsole('error', tag, [error, context ?? '']);
    },
  };
}
