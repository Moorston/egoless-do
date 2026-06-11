# Grace Period Optimization — Spec

## Data Model

### CheckinEntry (extend)

```ts
export interface CheckinEntry extends Syncable {
  date: string;
  done: boolean;
  note: string;
  streak: number;
  totalDays?: number;
  weight?: number;
  timestamp?: number;
  grace?: boolean;  // NEW: true = this day was a grace restore
}
```

Backward compatible: `undefined` means normal checkin.

### UserProfile (extend)

```ts
interface UserProfile {
  // ...existing fields
  graceMonthlyQuota?: number;  // 0-5, default 2, 0 = disable grace
}
```

## Business Logic

### `business/grace.ts` (new file)

```ts
/** Count grace records in a given month (YYYY-MM) */
export function getMonthGraceCount(
  graceHistory: GraceHistoryEntry[],
  yearMonth: string,  // "2026-06"
): number

/** Get remaining grace quota for current month */
export function getRemainingGrace(
  graceHistory: GraceHistoryEntry[],
  quota: number,
  currentMonth: string,
): number

/** Check if grace restore is available right now */
export function isGraceAvailable(
  graceHistory: GraceHistoryEntry[],
  quota: number,
  currentMonth: string,
  yesterdayDate: string,
): boolean
```

### `business/checkin.ts` (modify)

```ts
export function submitCheckinEntry(
  history: CheckinEntry[],
  done: boolean,
  note: string,
  dateOverride?: string,
  weight?: number,
  grace?: boolean,  // NEW parameter
): { record: CheckinEntry; history: CheckinEntry[]; streak: number }
```

Inside, set `grace: grace ?? false` on the record.

## Store Layer

### `createCheckinSlice.ts`

```ts
// submitCheckin: pass grace through
submitCheckin(done, note, date?, weight?, grace?) {
  const result = submitCheckinEntry(history, done, note, date, weight, grace);
  // ...
}

// addGraceRecord: guard against duplicates
addGraceRecord(date: string) {
  if ((get().graceHistory ?? []).some(g => g.date === date)) return;
  // ...
}
```

## UI Components

### CheckinModal (grace mode)

New prop: `graceDate?: string`

When `graceDate` is set:
- Show hint banner: "宽限期补卡 · {date}"
- Use `graceDate` instead of `today` for:
  - Existing record lookup
  - Habit checkin state
  - Plan item state
  - Custom todos
  - Incomplete items check
  - submitCheckin date parameter
  - Habit/plan item toggle submissions
- Hide: food section, water section
- Hide: CheckinReflection after submit
- Submit button text: "提交补卡"
- Pass `grace: true` to submitCheckin

### GracePage (redesign)

Layout:
1. **Header**: Screen title + back button
2. **Status card**: Same as current (missed / already done / restored)
3. **Restore button**: Opens CheckinModal with graceDate=yesterday (instead of one-click)
   - Disabled when quota exhausted
4. **Quota progress bar**: "本月已用 {used}/{total} 次"
5. **Quota setting**: Horizontal selector [0] [1] [2] [3] [4] [5]
6. **Grace history timeline**: List of past grace records with date, time, streak info

### HomeScreen — Streak Pending State

```
isStreakAtRisk =
  yesterday NOT checked in
  && isGraceAvailable(graceHistory, quota, currentMonth, yesterday)

Display:
  if (isStreakAtRisk): "⚠️ 连胜待定 · 补卡保持连胜"
  else if (streak > 0): "🔥 {streak} 天连胜"
  else: (no streak display)
```

### Heatmap — Grace Day Styling

```
if (record?.grace):
  borderStyle: 'dashed'
  borderWidth: 2
  borderColor: primaryColor
  backgroundColor: primaryColor * 0.4

if (record?.done && !record?.grace):
  backgroundColor: primaryColor (solid)
```

### Checkin History — Grace Badge

In checkin history list, when `record.grace === true`:
- Show small badge/tag: "宽限期补卡"
- Different color or icon from normal checkin

## i18n Keys

| Key | zh | en | zh-Hant |
|-----|----|----|---------|
| `graceCheckinTitle` | 宽限期补卡 | Grace Check-in | 寬限期補卡 |
| `graceCheckinHint` | 为昨天完成打卡，标记为补卡天 | Complete check-in for yesterday | 為昨天完成打卡，標記為補卡天 |
| `graceCheckinSubmit` | 提交补卡 | Submit Catch-up | 提交補卡 |
| `graceQuotaUsed` | 本月已用 {used}/{total} 次 | Used {used}/{total} this month | 本月已用 {used}/{total} 次 |
| `graceQuotaExhausted` | 本月宽限次数已用完 | Monthly grace quota used up | 本月寬限次數已用完 |
| `graceQuotaReset` | 下月重置 | Resets next month | 下月重置 |
| `graceStreakPending` | 连胜待定 · 补卡保持连胜 | Streak pending — catch up to keep it | 連勝待定 · 補卡保持連勝 |
| `graceSettingTitle` | 每月宽限次数 | Monthly Grace Quota | 每月寬限次數 |
| `graceSettingHint` | 设为 0 可完全禁用宽限期 | Set to 0 to disable grace period | 設為 0 可完全禁用寬限期 |

## SQLite Migration

```sql
-- Add grace column to checkin_history
ALTER TABLE checkin_history ADD COLUMN grace INTEGER DEFAULT 0;
```

## Entity Table Map

```ts
checkin: {
  // ...existing columns
  grace: 'grace',  // boolean → INTEGER
}
```

## Sync

No changes to sync protocol. The `grace` field is included in the JSON payload automatically via the existing entity serialization.
