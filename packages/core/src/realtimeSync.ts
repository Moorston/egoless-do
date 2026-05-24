// ─── Real-time Sync Service ──────────────────────────────────────
// Uses Server-Sent Events (SSE) for real-time updates from PocketBase

export interface RealtimeEvent {
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  payload: Record<string, unknown>;
  deleted?: boolean;
  timestamp: number;
}

export interface RealtimeState {
  connected: boolean;
  lastEventAt: number | null;
  error: string | null;
}

type Listener = (event: RealtimeEvent) => void;
type StateListener = (state: RealtimeState) => void;

const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_DELAY = 60000; // 1 minute

export class RealtimeSyncService {
  private eventSource: EventSource | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private state: RealtimeState = {
    connected: false,
    lastEventAt: null,
    error: null,
  };
  private reconnectDelay = RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private apiBase: string = '';

  constructor(apiBase: string) {
    this.apiBase = apiBase.replace(/\/+$/, '');
  }

  // ── Public API ─────────────────────────────────────────────────

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => { this.stateListeners.delete(listener); };
  }

  getState(): RealtimeState {
    return { ...this.state };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateState({ connected: false, error: null });
  }

  // ── Private ────────────────────────────────────────────────────

  private connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    if (!this.token) return;

    const url = `${this.apiBase}/api/sync/realtime?token=${encodeURIComponent(this.token)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectDelay = RECONNECT_DELAY; // Reset delay on successful connection
      this.updateState({ connected: true, error: null });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle heartbeat
        if (data.type === 'heartbeat') {
          return;
        }

        // Handle connection message
        if (data.type === 'connected') {
          console.log('[Realtime] Connected:', data.userId);
          return;
        }

        // Handle data events
        const realtimeEvent: RealtimeEvent = {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          payload: data.payload,
          deleted: data.deleted,
          timestamp: data.timestamp,
        };

        this.updateState({ lastEventAt: data.timestamp });
        this.emit(realtimeEvent);
      } catch (err) {
        console.error('[Realtime] Parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      this.updateState({ connected: false, error: '连接断开' });
      this.eventSource?.close();
      this.eventSource = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (!this.token) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }, this.reconnectDelay);
  }

  private emit(event: RealtimeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Realtime] Listener error:', err);
      }
    }
  }

  private updateState(partial: Partial<RealtimeState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateListeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[Realtime] State listener error:', err);
      }
    }
  }
}

// Singleton instance
let instance: RealtimeSyncService | null = null;

export function getRealtimeSyncService(apiBase: string): RealtimeSyncService {
  if (!instance) {
    instance = new RealtimeSyncService(apiBase);
  }
  return instance;
}
