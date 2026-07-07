// ─── Offline-Aware Fetch Wrapper ──────────────────────────────────
// Automatically checks network status and attaches auth token.
import { getAuthToken } from '../store/authToken';
import { useNetworkStatus } from '../store/useNetworkStatus';

export class OfflineError extends Error {
  constructor() {
    super('当前无网络连接');
    this.name = 'OfflineError';
  }
}

interface OfflineFetchOptions extends RequestInit {
  /** Skip network check (for background probes). */
  skipNetworkCheck?: boolean;
}

/**
 * Fetch wrapper that checks network availability and auto-attaches auth token.
 * Throws OfflineError if network is unavailable.
 */
export async function offlineAwareFetch(url: string, options: OfflineFetchOptions = {}): Promise<Response> {
  const { skipNetworkCheck, ...fetchOptions } = options;

  if (!skipNetworkCheck) {
    const { isConnected, isInternetReachable } = useNetworkStatus.getState();
    if (!isConnected || !isInternetReachable) {
      throw new OfflineError();
    }
  }

  // Auto-attach auth token if no Authorization header
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };
  if (!headers['Authorization']) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return fetch(url, { ...fetchOptions, headers });
}
