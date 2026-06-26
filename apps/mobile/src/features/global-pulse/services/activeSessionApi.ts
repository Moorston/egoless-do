/**
 * 活跃会话 API 服务
 * 管理实时在线会话的 CRUD 和实时订阅
 */

import { ActiveSession, ApiResponse, CheckinType } from '../types/globalPulse';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8090';
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
      if (__DEV__) console.warn('[ConnectionState] Listener error:', err);
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
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

function mapSession(item: any): ActiveSession {
  return {
    session_id: item.session_id || item.id,
    user_hash: item.user_hash,
    nickname: item.nickname || '',
    type: item.type as CheckinType,
    started_at: item.started_at,
    last_heartbeat: item.last_heartbeat,
    goal: item.goal || undefined,
    insight: item.insight || undefined,
    sport_key: item.sport_key || undefined,
    sport_icon: item.sport_icon || undefined,
    lat: item.lat != null ? Number(item.lat) : undefined,
    lng: item.lng != null ? Number(item.lng) : undefined,
  };
}

// ── CRUD operations ───────────────────────────────────────────────

export async function createSession(
  data: Omit<ActiveSession, 'session_id' | 'last_heartbeat'> & { session_id?: string }
): Promise<ApiResponse<ActiveSession>> {
  const sessionId = data.session_id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const result = await pbRequest<any>(
    `/api/collections/${COLLECTION}/records?filter=${filter}&perPage=10`
  );

  if (result.success && result.data?.items) {
    for (const item of result.data.items) {
      await deleteSession(item.id);
    }
  }
}

export async function getActiveSessions(
  type?: CheckinType
): Promise<ApiResponse<ActiveSession[]>> {
  const filters: string[] = [];
  if (type) {
    filters.push(`type = "${type}"`);
  }

  const queryParams = new URLSearchParams();
  if (filters.length > 0) {
    queryParams.set('filter', filters.join(' && '));
  }
  queryParams.set('perPage', '500');
  queryParams.set('sort', '-started_at');

  const query = queryParams.toString();
  const result = await pbRequest<{ items: unknown[] }>(
    `/api/collections/${COLLECTION}/records${query ? `?${query}` : ''}`
  );

  if (result.success && result.data) {
    const sessions = (result.data.items || []).map(mapSession);
    return { success: true, data: sessions };
  }

  return result as ApiResponse<ActiveSession[]>;
}

// ── Realtime subscription (polling for PocketBase v0.22 compat) ───

export type SessionSubscriptionCallback = {
  onCreate?: (session: ActiveSession) => void;
  onUpdate?: (session: ActiveSession) => void;
  onDelete?: (sessionId: string) => void;
};

const POLL_INTERVAL = 15_000; // 15 seconds

/**
 * Subscribe to active_sessions collection changes via short polling.
 * Compatible with PocketBase v0.22 which doesn't support POST /api/realtime.
 * Returns unsubscribe function.
 */
export function subscribeSessions(
  callbacks: SessionSubscriptionCallback
): () => void {
  let isActive = true;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let previousSessions: ActiveSession[] = [];

  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const poll = async () => {
    if (!isActive) return;
    try {
      const result = await getActiveSessions();
      if (!result.success || !result.data) return;

      const current = result.data;
      const prevMap = new Map(previousSessions.map(s => [s.session_id, s]));
      const currMap = new Map(current.map(s => [s.session_id, s]));

      // Detect creates and updates
      for (const session of current) {
        const prev = prevMap.get(session.session_id);
        if (!prev) {
          callbacks.onCreate?.(session);
        } else if (prev.last_heartbeat !== session.last_heartbeat || prev.insight !== session.insight) {
          callbacks.onUpdate?.(session);
        }
      }

      // Detect deletes
      for (const prev of previousSessions) {
        if (!currMap.has(prev.session_id)) {
          callbacks.onDelete?.(prev.session_id);
        }
      }

      previousSessions = current;
      setConnectionState('connected');
    } catch {
      // Ignore poll errors silently
    }
  };

  setConnectionState('connecting');
  // Initial fetch
  void poll();
  // Start polling
  pollTimer = setInterval(() => { void poll(); }, POLL_INTERVAL);

  return () => {
    isActive = false;
    cleanup();
    setConnectionState('idle');
  };
}
