// ─── SyncTimestampManager ──────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-4 of AR-01 refactoring)
// Manages clock offset and last sync timestamp persistence.

import { openDatabase, getState, setState } from '../../db/schema';
import { createLogger, MS_PER_DAY } from '@egoless-do/core';

const log = createLogger('SyncTimestamp');
const CLOCK_OFFSET_KEY = 'sync_clock_offset';

export class SyncTimestampManager {
  private _lastSyncAt = 0;
  private _lastSyncAtLoaded = false;
  private _clockOffset = 0;

  getLastSyncAt(): number { return this._lastSyncAt; }
  setLastSyncAt(ts: number) { this._lastSyncAt = ts; }
  getClockOffset(): number { return this._clockOffset; }

  // ── Clock offset ─────────────────────────────────────────────────────

  async loadClockOffset(): Promise<void> {
    try {
      const db = await openDatabase();
      const v = await getState(db, CLOCK_OFFSET_KEY);
      if (v) this._clockOffset = parseInt(v, 10) || 0;
    } catch {} // intentional: clock offset is optional, defaults to 0
  }

  async saveClockOffset(offset: number): Promise<void> {
    this._clockOffset = offset;
    try {
      const db = await openDatabase();
      await setState(db, CLOCK_OFFSET_KEY, String(offset));
    } catch {} // intentional: best-effort persistence
  }

  updateClockOffset(serverTime: number): void {
    if (!serverTime || serverTime <= 0) return;
    const offset = serverTime - Date.now();
    if (Math.abs(offset) < MS_PER_DAY) {
      this.saveClockOffset(offset);
    }
  }

  // ── Last sync timestamp ──────────────────────────────────────────────

  async loadLastSyncAt(): Promise<void> {
    if (this._lastSyncAtLoaded) return;
    try {
      const db = await openDatabase();
      const val = await getState(db, 'lastSyncAt');
      if (val) this._lastSyncAt = Number(val) || 0;
    } catch {} // intentional: lastSyncAt defaults to 0
    this._lastSyncAtLoaded = true;
  }

  async saveLastSyncAt(ts: number): Promise<void> {
    try {
      const db = await openDatabase();
      await setState(db, 'lastSyncAt', String(ts));
    } catch {} // intentional: best-effort persistence
  }

  resetLastSyncAt(): void {
    this._lastSyncAt = 0;
    this._lastSyncAtLoaded = false;
  }
}