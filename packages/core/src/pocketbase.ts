// ─── PocketBase client singleton ─────────────────────────────────
// Shared across all platforms. Call setPocketbaseUrl() once at app init.
import PocketBase from 'pocketbase';

let _pb: PocketBase | null = null;

export function setPocketbaseUrl(url: string) {
  _pb = new PocketBase(url);
}

export function getPb(): PocketBase {
  if (!_pb) throw new Error('PocketBase not initialized. Call setPocketbaseUrl() first.');
  return _pb;
}

/**
 * Inject the current PocketBase-native auth token into the SDK authStore.
 *
 * NOTE: On mobile, authenticated traffic currently goes through `fetch` + `Bearer`
 * headers (offlineAwareFetch / realtime / sync tokenProvider), not through this SDK.
 * See docs/auth-token-bridge.md. This hook keeps the SDK auth-aware so that any
 * future use of `getPb()` for auth-bound operations carries the same token, instead
 * of silently issuing unauthenticated (guest) requests. It is a defensive bridge
 * that eliminates the implicit "PB accepts the gateway token" assumption.
 */
export function setPocketbaseToken(token: string | null): void {
  if (!_pb) return;
  if (token) {
    _pb.authStore.save(token, null);
  } else {
    _pb.authStore.clear();
  }
}
