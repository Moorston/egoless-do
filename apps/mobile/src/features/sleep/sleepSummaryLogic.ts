// ─── SleepSummaryCard pure logic ──────────────────────────────────
// Extracted from SleepSummaryCard.tsx for unit-testable logic without
// React Native rendering. The component re-exports these for runtime use.

import type { WorkState } from '@egoless-do/core';

/** Format duration in minutes to "XhYm" display string. */
export function formatDuration(min: number): string {
  if (min <= 0) return '--';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m}m`;
}

/** Format timestamp (ms) to "HH:MM" display string. */
export function formatTime(ts?: number): string {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Count non-empty gratitude entries. */
export function countGratitude(gratitude?: string[]): number {
  if (!gratitude) return 0;
  return gratitude.filter(g => g && g.trim()).length;
}

/** Find work-state label key by work-state value. */
export function findWorkStateLabelKey(workState: WorkState | null): string | null {
  const opt = WORK_STATE_OPTIONS.find(o => o.key === workState);
  return opt ? opt.labelKey : null;
}

/** Map quality (1-5) to a short Chinese label. */
export function qualityLabel(quality: number): string {
  if (quality >= 5) return '很好';
  if (quality >= 4) return '好';
  if (quality >= 3) return '一般';
  if (quality >= 2) return '偏差';
  if (quality >= 1) return '差';
  return '';
}

/** Format "YYYY-MM-DD" to "M月D日" display string. */
export function formatSleepDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return `${m}月${d}日`;
}

/** Work-state options — mirrors SleepSummaryCard WORK_STATE_OPTIONS. */
export const WORK_STATE_OPTIONS: { key: WorkState; labelKey: string }[] = [
  { key: 'energetic', labelKey: 'sleepWorkEnergetic' },
  { key: 'normal',    labelKey: 'sleepWorkNormal' },
  { key: 'tired',     labelKey: 'sleepWorkTired' },
  { key: 'exhausted', labelKey: 'sleepWorkExhausted' },
];

/** Compute star fill state for a given star index and current value. */
export function isStarFilled(starIndex: number, currentValue: number): boolean {
  return starIndex <= currentValue;
}

/** Validate quality value is in valid range 1-5. */
export function isValidQuality(q: number): boolean {
  return q >= 1 && q <= 5;
}

/** Parse a "HH:MM" string into today's timestamp (ms). Returns undefined if invalid. */
export function parseHHMM(str: string): number | undefined {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours > 23 || minutes > 59) return undefined;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/** Format a timestamp back to "HH:MM". */
export function formatHHMM(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
