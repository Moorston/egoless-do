// ─── Subscription Registry ────────────────────────────────────────
// Central registry for module-level permanent subscriptions/listeners.
// Modules register cleanup functions; cleanupApp() invokes them all.
//
// Design: .trellis/tasks/archive/2026-07/07-29-p1-cleanup-app-mechanism/design.md

type CleanupFn = () => void;

const _registry: CleanupFn[] = [];

/** Register a cleanup function to be called by cleanupApp(). */
export function registerCleanup(fn: CleanupFn): void {
  _registry.push(fn);
}

/**
 * Invoke all registered cleanup functions and clear the registry.
 * Best-effort: errors in individual cleanups are swallowed so one failing
 * cleanup cannot prevent others from running.
 */
export function cleanupApp(): void {
  for (const fn of _registry) {
    try {
      fn();
    } catch {
      // best-effort cleanup — swallow to avoid cascading failures
    }
  }
  _registry.length = 0;
}
