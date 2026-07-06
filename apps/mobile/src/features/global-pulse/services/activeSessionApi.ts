/**
 * 活跃会话 API 服务
 * 管理实时在线会话的 CRUD 和实时订阅
 */

import { ActiveSession, ApiResponse, CheckinType } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

const log = createLogger('GlobalPulse');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://egolessdo.freebytes.net';
const COLLECTION = 'active_sessions';
const REQUEST_TIMEOUT = 10000;

// ── Connection state ──────────────────────────────────────────────
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

let _connectionState: ConnectionState = 'idle';
let _connectionListeners: Array<(state: ConnectionState) => void> = [];

export function getConnectionState(): ConnectionState {
  return _connectionState;
}

export function onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
  _connectionListeners.push(listener);
  return () => {
    _connectionListeners = _connectionListeners.filter(l => l !== listener);
  };
}

function setConnectionState(state: ConnectionState) {
  if (_connectionState === state) return;
  _connectionState = state;
  for (const listener of _connectionListeners) {
    try { listener(state); } catch (err) {
      if (__DEV__) log.warn('ConnectionState listener error:', err);
    }
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────
async function pbRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (options.method === 'DELETE' && response.ok) {
      return { success: true } as ApiResponse<T>;
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || '请求失败'
        }
      };
    }

    return { success: true, data };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: '请求超时' }
      };
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '网络连接失败' }
    };
  }
}

function mapSession(raw: any): ActiveSession {
  const item = raw as Record<string, unknown>;
  return {
    session_id: (item.session_id || item.id) as string,
    user_hash: item.user_hash as string,
    nickname: (item.nickname || '') as string,
    type: item.type as CheckinType,
    started_at: item.started_at as string,
    last_heartbeat: item.last_heartbeat as string,
    goal: (item.goal || undefined) as string | undefined,
    insight: (item.insight || undefined) as string | undefined,
    sport_key: (item.sport_key || undefined) as string | undefined,
    sport_icon: (item.sport_icon || undefined) as string | undefined,
    lat: item.lat != null ? Number(item.lat) : undefined,
    lng: item.lng != null ? Number(item.lng) : undefined,
  };
}

// ── CRUD operations ───────────────────────────────────────────────

export async function createSession(
  data: Omit<ActiveSession, 'session_id' | 'last_heartbeat' | 'started_at'> & { session_id?: string; started_at?: string }
): Promise<ApiResponse<ActiveSession>> {
  const sessionId = data.session_id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  const result = await pbRequest<unknown>(
    `/api/collections/${COLLECTION}/records`,
    {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        user_hash: data.user_hash,
        nickname: data.nickname || '',
        type: data.type,
        started_at: data.started_at || now,
        last_heartbeat: now,
        goal: data.goal || '',
        insight: data.insight || '',
        sport_key: data.sport_key || '',
        sport_icon: data.sport_icon || '',
        lat: data.lat,
        lng: data.lng,
      }),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: mapSession(result.data) };
  }

  return result as ApiResponse<ActiveSession>;
}

export async function updateSession(
  recordId: string,
  data: Partial<Pick<ActiveSession, 'insight' | 'last_heartbeat' | 'goal'>>
): Promise<ApiResponse<ActiveSession>> {
  const body: Record<string, unknown> = {};
  if (data.insight !== undefined) body.insight = data.insight;
  if (data.last_heartbeat !== undefined) body.last_heartbeat = data.last_heartbeat;
  if (data.goal !== undefined) body.goal = data.goal;

  const result = await pbRequest<unknown>(
    `/api/collections/${COLLECTION}/records/${recordId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: mapSession(result.data) };
  }

  return result as ApiResponse<ActiveSession>;
}

export async function deleteSession(recordId: string): Promise<ApiResponse<void>> {
  return pbRequest<void>(
    `/api/collections/${COLLECTION}/records/${recordId}`,
    { method: 'DELETE' }
  );
}

export async function deleteSessionsByUserHash(userHash: string): Promise<void> {
  const filter = encodeURIComponent(`user_hash = "${userHash}"`);
  // Paginate until all sessions are deleted
  let page = 1;
  // eslint-disable-next-line no-constant-condition -- intentional infinite loop with break
  while (true) {
    const result = await pbRequest<any>(
      `/api/collections/${COLLECTION}/records?filter=${filter}&perPage=50&page=${page}`
    );
    if (!result.success || !result.data?.items?.length) break;
    for (const item of result.data.items) {
      await deleteSession(item.id);
    }
    if (!result.data.items.length || result.data.items.length < 50) break;
    page++;
  }
}

export async function getActiveSessions(
  type?: CheckinType
): Promise<ApiResponse<ActiveSession[]>> {
  const filters: string[] = [];
  if (type) {
    filters.push(`type = "${type}"`);
  }

  const queryParts: string[] = [];
  if (filters.length > 0) {
    queryParts.push(`filter=${encodeURIComponent(filters.join(' && '))}`);
  }
  queryParts.push('perPage=500');
  queryParts.push('sort=-started_at');
  const query = queryParts.join('&');
  const result = await pbRequest<{ items: unknown[] }>(
    `/api/collections/${COLLECTION}/records${query ? `?${query}` : ''}`
  );

  if (result.success && result.data) {
    const sessions = (result.data.items || []).map((item: unknown) => mapSession(item));
    return { success: true, data: sessions };
  }

  return result as unknown as ApiResponse<ActiveSession[]>;
}

// ── Realtime subscription (adaptive polling) ─────────────────

export type SessionSubscriptionCallback = {
  onCreate?: (session: ActiveSession) => void;
  onUpdate?: (session: ActiveSession) => void;
  onDelete?: (sessionId: string) => void;
};

const POLL_INTERVAL_ACTIVE = 5_000;   // 5 seconds when map is visible
const POLL_INTERVAL_IDLE = 30_000;    // 30 seconds when backgrounded
const POLL_INTERVAL_INITIAL = 2_000;  // 2 seconds for first few polls after change

/**
 * Subscribe to active_sessions collection changes via adaptive polling.
 * Polls faster (5s) when visible, slower (30s) when backgrounded.
 * Returns unsubscribe function.
 */
export function subscribeSessions(
  callbacks: SessionSubscriptionCallback
): () => void {
  let isActive = true;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let previousSessions: ActiveSession[] = [];
  let consecutiveNoChange = 0;
  let _isVisible = true;
  let _polling = false;

  const cleanup = () => {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const getInterval = () => {
    if (!_isVisible) return POLL_INTERVAL_IDLE;
    if (consecutiveNoChange < 3) return POLL_INTERVAL_INITIAL;
    return POLL_INTERVAL_ACTIVE;
  };

  const scheduleNext = () => {
    if (!isActive) return;
    pollTimer = setTimeout(() => { void poll(); }, getInterval());
  };

  const poll = async () => {
    if (!isActive || _polling) return;
    _polling = true;
    try {
      const result = await getActiveSessions();
      if (!result.success || !result.data) {
        scheduleNext();
        return;
      }

      const current = result.data;
      const prevMap = new Map(previousSessions.map(s => [s.session_id, s]));
      const currMap = new Map(current.map(s => [s.session_id, s]));

      let hasChanges = false;

      // Detect creates and updates
      for (const session of current) {
        const prev = prevMap.get(session.session_id);
        if (!prev) {
          callbacks.onCreate?.(session);
          hasChanges = true;
        } else if (prev.last_heartbeat !== session.last_heartbeat || prev.insight !== session.insight) {
          callbacks.onUpdate?.(session);
          hasChanges = true;
        }
      }

      // Detect deletes
      for (const prev of previousSessions) {
        if (!currMap.has(prev.session_id)) {
          callbacks.onDelete?.(prev.session_id);
          hasChanges = true;
        }
      }

      previousSessions = current;
      consecutiveNoChange = hasChanges ? 0 : consecutiveNoChange + 1;
      setConnectionState('connected');
    } catch {
      // Ignore poll errors silently
    } finally {
      _polling = false;
    }
    scheduleNext();
  };

  setConnectionState('connecting');
  void poll();

  // Visibility listener for adaptive interval
  let _appStateSub: { remove?: () => void } | null = null;
  try {
    const { AppState } = require('react-native');
    _appStateSub = AppState.addEventListener('change', (s: string) => {
      _isVisible = s === 'active';
      // Reset timer with new interval (in-flight poll will reschedule itself via scheduleNext)
      cleanup();
      scheduleNext();
    });
  } catch {
    // Not in React Native context (tests, SSR) — skip visibility listener
  }

  return () => {
    isActive = false;
    cleanup();
    _appStateSub?.remove?.();
    setConnectionState('idle');
  };
}
