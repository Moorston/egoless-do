import { SYNC_ENTITIES, createLogger, SCHEMAS } from '@egoless-do/core';
import EventSource from 'react-native-sse';

const log = createLogger('Realtime');

// Dynamically generate reverse map: PB collection name → sync entity key
// This stays in sync with entitySchemas.ts automatically
const COLLECTION_MAP: Record<string, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as Array<keyof typeof SCHEMAS>).map(k => [
    SCHEMAS[k].pocketbase.collection,
    k,
  ]),
);

export interface RealtimeChangeEvent {
  type: 'record_created' | 'record_updated' | 'record_deleted';
  entity: string;
  collection: string;
  recordId: string;
  /** Full record payload (present when server sends SSE with payload) */
  payload?: Record<string, unknown>;
}

export class RealtimeAgent {
  private _es: EventSource | null = null;
  private _pbUrl = '';
  private _token = '';
  private _clientId = '';
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectAttempt = 0;
  private _maxReconnectAttempts = 10;
  private _onChange: ((event: RealtimeChangeEvent) => void) | null = null;
  private _onStatus: ((connected: boolean) => void) | null = null;
  private _destroyed = false;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _consecutiveHeartbeatFailures = 0;
  private static MAX_HEARTBEAT_FAILURES = 5;
  private _onKickedOut: (() => void) | null = null;

  setChangeHandler(fn: (event: RealtimeChangeEvent) => void) { this._onChange = fn; }
  setStatusHandler(fn: (connected: boolean) => void) { this._onStatus = fn; }
  setKickedOutHandler(fn: () => void) { this._onKickedOut = fn; }

  connect(pbUrl: string, token: string) {
    if (this._es) this.disconnect();
    this._destroyed = false;
    this._pbUrl = pbUrl.replace(/\/+$/, '');
    this._token = token;
    this._reconnectAttempt = 0;
    this._consecutiveHeartbeatFailures = 0;
    this._open();
    this._startHeartbeat();
  }

  disconnect() {
    this._destroyed = true;
    this._clearReconnect();
    this._stopHeartbeat();
    if (this._es) { this._es.close(); this._es = null; }
    this._clientId = '';
    this._reconnectAttempt = 0;
    this._onStatus?.(false);
  }

  private _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._destroyed) { this._stopHeartbeat(); return; }
      if (!this._token || !this._pbUrl) return;
      fetch(`${this._pbUrl}/api/realtime/ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this._token}` },
      }).then((res) => {
        // Successful ping resets the failure counter
        if (res.ok) this._consecutiveHeartbeatFailures = 0;
        else this._consecutiveHeartbeatFailures++;
      }).catch(() => {
        // Ping failed — only count as failure if SSE is also dead
        if (this._destroyed) return;
        if (this._es && (this._es as unknown as { readyState: number }).readyState === 1) { // 1 = EventSource.OPEN
          // SSE is still healthy; ping failure is transient (mobile network blip)
          log.debug('Ping failed but SSE still open, ignoring');
          return;
        }
        this._consecutiveHeartbeatFailures++;
        log.warn('Ping failed and SSE is not open, triggering reconnect');
        this._onStatus?.(false);
        this._scheduleReconnect();
      });

      // After N consecutive failures, the connection is considered dead
      if (this._consecutiveHeartbeatFailures >= RealtimeAgent.MAX_HEARTBEAT_FAILURES) {
        log.warn(`${this._consecutiveHeartbeatFailures} consecutive heartbeat failures — treating as kicked out`);
        this._consecutiveHeartbeatFailures = 0;
        this._onStatus?.(false);
        this._onKickedOut?.();
        // Don't schedule reconnect — kicked-out handler will manage re-auth
      }
    }, 30_000);
  }

  private _stopHeartbeat() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }

  private _clearReconnect() {
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
  }

  private _scheduleReconnect() {
    if (this._destroyed) return;
    if (this._reconnectAttempt >= this._maxReconnectAttempts) { log.warn('Max reconnect attempts'); return; }
    const base = Math.min(Math.pow(2, this._reconnectAttempt) * 1000, 30000);
    const jitter = Math.random() * 2000;
    const delay = Math.round(base + jitter);
    this._reconnectAttempt++;
    this._clearReconnect();
    this._reconnectTimer = setTimeout(() => {
      if (!this._destroyed && this._token) this._open();
    }, delay);
  }

  private _open() {
    if (this._destroyed || !this._token) return;
    const es = new EventSource(`${this._pbUrl}/api/realtime`, {
      headers: { Authorization: `Bearer ${this._token}` },
    });
    this._es = es;

    es.addEventListener('open', () => {
      log.info('SSE opened');
      this._consecutiveHeartbeatFailures = 0; // Reset heartbeat failure counter on successful connect
    });

    es.addEventListener('message', (event) => {
      if (event.type === 'message') this._handleEvent('message', event.data);
    });

    const pbEvents = ['PB_CONNECTED', 'record_created', 'record_updated', 'record_deleted', 'sync_batch'];
    for (const evt of pbEvents) {
      (es as unknown as EventTarget).addEventListener(evt, (event: Event) => {
        const msgEvent = event as unknown as { type: string; data: unknown };
        this._handleEvent(msgEvent.type, msgEvent.data);
      });
    }

    es.addEventListener('error', (error) => {
      log.warn('SSE error:', (error instanceof Error ? error.message : null) || 'unknown');
      this._onStatus?.(false);
      this._scheduleReconnect();
    });
  }

  private _handleEvent(eventType: string, rawData: string | null) {
    try {
      if (!rawData) return;
      const data = JSON.parse(rawData);

      if (eventType === 'PB_CONNECTED') {
        this._clientId = data.clientId;
        this._reconnectAttempt = 0;
        this._consecutiveHeartbeatFailures = 0;
        this._onStatus?.(true);
        this._subscribe();
        return;
      }

      // Handle batched SSE events (multiple changes in one notification)
      if (eventType === 'sync_batch') {
        const items: Array<{ eventType: string; entity: string; collection: string; recordId: string; payload?: Record<string, unknown> }> = data.items;
        if (!Array.isArray(items)) return;
        this._reconnectAttempt = 0;
        for (const item of items) {
          if (!item.collection || !item.recordId) continue;
          this._onChange?.({
            type: item.eventType as RealtimeChangeEvent['type'],
            entity: COLLECTION_MAP[item.collection] ?? item.entity ?? item.collection,
            collection: item.collection,
            recordId: item.recordId,
            payload: item.payload,
          });
        }
        return;
      }

      const collection = data.collection ?? data.record?.collectionName;
      const recordId = data.recordId ?? data.record?.id;
      if (!collection || !recordId) return;

      const entity = COLLECTION_MAP[collection] ?? collection;
      this._reconnectAttempt = 0;

      this._onChange?.({
        type: eventType as RealtimeChangeEvent['type'],
        entity,
        collection,
        recordId,
        payload: data.payload,
      });
    } catch (e) {
      log.error(e, { eventType, rawData });
    }
  }

  private async _subscribe() {
    if (!this._clientId) return;
    try {
      const collections = SYNC_ENTITIES
        .map(e => SCHEMAS[e as keyof typeof SCHEMAS]?.pocketbase?.collection)
        .filter(Boolean);
      const formData = new FormData();
      formData.append('clientId', this._clientId);
      formData.append('subscriptions', JSON.stringify(collections));
      const res = await fetch(`${this._pbUrl}/api/realtime`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this._token}` },
        body: formData,
      });
      if (!res.ok) { log.warn('Subscription failed:', res.status); this._scheduleReconnect(); }
      else log.info(`Subscribed to ${collections.length} collections`);
    } catch (err) {
      log.warn('Subscription error:', err);
      this._scheduleReconnect();
    }
  }
}
