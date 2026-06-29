import EventSource from 'react-native-sse';
import { SYNC_ENTITIES, createLogger } from '@egoless-do/core';

const log = createLogger('Realtime');

const COLLECTION_MAP: Record<string, string> = {
  habits: 'habit', mind_reflections: 'reflection', fasting_sessions: 'fasting',
  food_entries: 'food', checkin_records: 'checkin', meditation_history: 'meditation',
  user_profiles: 'profile', exercise_entries: 'exercise', plans: 'plan',
  plan_items: 'planItem', plan_item_checkins: 'planItemCheckin',
  daily_custom_todos: 'dailyCustomTodo', daily_todo_history: 'dailyTodoHistory',
  grace_history: 'grace', thought_trails: 'thoughtTrail', trail_notes: 'trailNote',
  reflection_links: 'reflectionLink', ai_configs: 'aiConfig', checkin_reviews: 'checkinReview',
};

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

  setChangeHandler(fn: (event: RealtimeChangeEvent) => void) { this._onChange = fn; }
  setStatusHandler(fn: (connected: boolean) => void) { this._onStatus = fn; }

  connect(pbUrl: string, token: string) {
    if (this._es) this.disconnect();
    this._destroyed = false;
    this._pbUrl = pbUrl.replace(/\/+$/, '');
    this._token = token;
    this._reconnectAttempt = 0;
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
      }).catch(() => {
        // Ping failed — connection is likely dead
        if (!this._destroyed) {
          this._onStatus?.(false);
          this._scheduleReconnect();
        }
      });
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

    es.addEventListener('open', () => log.info('SSE opened'));

    es.addEventListener('message', (event) => {
      if (event.type === 'message') this._handleEvent('message', event.data);
    });

    const pbEvents = ['PB_CONNECTED', 'record_created', 'record_updated', 'record_deleted', 'sync_batch'];
    for (const evt of pbEvents) {
      (es as any).addEventListener(evt, (event: any) => this._handleEvent(event.type, event.data));
    }

    es.addEventListener('error', (error) => {
      log.warn('SSE error:', (error as any)?.message || 'unknown');
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
      const collections = SYNC_ENTITIES.map(e => COLLECTION_MAP[e] || (e + 's')).filter(Boolean);
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
