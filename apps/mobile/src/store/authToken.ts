// ─── Unified Auth Token Access ─────────────────────────────────────
// Provides the current auth token from the app store.
import { useAppStore } from '../store/useAppStore';

/** Get the current auth token synchronously. Returns null if not signed in. */
export function getAuthToken(): string | null {
  const state = useAppStore.getState();
  return state.auth.token ?? null;
}

/** Get the current user ID synchronously. Returns null if not signed in. */
export function getAuthUserId(): string | null {
  const state = useAppStore.getState();
  return state.auth.user?.id ?? null;
}
