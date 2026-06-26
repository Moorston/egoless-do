// ─── Unified logger with Sentry integration ─────────────────────
// Replaces ad-hoc console.log/error/warn with structured logging.
// In dev: logs to console. In production: adds Sentry breadcrumbs/captures.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const TAG_PATTERN = /^\[[\w\s-]+\]/;

function formatMessage(tag: string, message: unknown): string {
  return `[${tag}] ${typeof message === 'string' ? message : JSON.stringify(message)}`;
}

function logToConsole(level: LogLevel, tag: string, args: unknown[]) {
  const prefix = `[${tag}]`;
  switch (level) {
    case 'debug':
      if (__DEV__) console.log(prefix, ...args);
      break;
    case 'info':
      console.log(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    case 'error':
      console.error(prefix, ...args);
      break;
  }
}

function addBreadcrumb(level: LogLevel, tag: string, message: string) {
  try {
    const Sentry = require('sentry-expo') ?? require('@sentry/nextjs');
    if (Sentry?.addBreadcrumb) {
      Sentry.addBreadcrumb({
        category: tag,
        message,
        level: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info',
      });
    }
  } catch {
    // Sentry not available — skip silently
  }
}

function captureError(tag: string, error: unknown, context?: Record<string, unknown>) {
  try {
    const Sentry = require('sentry-expo') ?? require('@sentry/nextjs');
    if (Sentry?.captureException) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { module: tag },
        extra: context,
      });
    }
  } catch {
    // Sentry not available
  }
}

export interface Logger {
  /** Debug-level logging (dev only). */
  debug: (...args: unknown[]) => void;
  /** Info-level logging. */
  info: (...args: unknown[]) => void;
  /** Warning-level logging. */
  warn: (...args: unknown[]) => void;
  /** Error logging — also captures to Sentry. */
  error: (error: unknown, context?: Record<string, unknown>) => void;
}

/**
 * Create a scoped logger for a module.
 *
 * @param tag - Module name (e.g., 'Sync', 'Rehydrate', 'GlobalPulse')
 *
 * @example
 * const log = createLogger('Sync');
 * log.info('Push started', items.length);
 * log.error(networkError, { endpoint: '/api/sync' });
 */
export function createLogger(tag: string): Logger {
  return {
    debug(...args: unknown[]) {
      logToConsole('debug', tag, args);
    },
    info(...args: unknown[]) {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      logToConsole('info', tag, args);
      addBreadcrumb('info', tag, msg);
    },
    warn(...args: unknown[]) {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      logToConsole('warn', tag, args);
      addBreadcrumb('warn', tag, msg);
    },
    error(error: unknown, context?: Record<string, unknown>) {
      logToConsole('error', tag, [error, context ?? '']);
      captureError(tag, error, context);
    },
  };
}
