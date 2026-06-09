# Streak Break Page — Spec

## Interfaces

### BreakInsight

```ts
export interface BreakInsight {
  weekdayDist: number[];    // [7] 索引0=周一, 6=周日, 每项=该星期几的中断次数
  monthDist: number[];      // [12] 索引0=1月, 11=12月, 每项=该月的中断次数
  avgStreak: number;        // 平均连胜天数, 保留1位小数
  avgRecoveryDays: number;  // 中断后平均恢复天数, 保留1位小数
  totalBreaks: number;
  monthlyTrend: { month: string; count: number }[];  // 最近6个月, month="YYYY-MM"
}
```

### RecoveryState

```ts
type RecoveryState = 'active' | 'just_broke' | 'at_risk' | 'long_absence';

interface RecoveryData {
  state: RecoveryState;
  currentStreak?: number;
  previousStreak?: number;
  daysSinceLastBreak?: number;
  daysSinceLastCheckin?: number;
}
```

### HypotheticalResult

```ts
interface HypotheticalResult {
  available: boolean;       // 当时是否有宽限期可用
  hypotheticalStreak: number; // 假设使用宽限期后的连胜天数
}
```

## Functions

### computeBreakInsights

```ts
function computeBreakInsights(
  breaks: StreakBreakEntry[],
  history: Array<{ date: string; done: boolean }>,
): BreakInsight
```

**Rules:**
- `weekdayDist`: 对每个 break 的 `breakDate`，取 `new Date(breakDate).getDay()` (0=周日→映射到索引6, 1=周一→索引0, ...)
- `monthDist`: 对每个 break 的 `breakDate`，取月份 (0-based index)
- `avgStreak`: `sum(breaks.map(b => b.lostStreak)) / breaks.length`, 保留1位小数
- `avgRecoveryDays`: 对每个 break，找 `history` 中 `breakDate` 之后第一个 `done=true` 的日期，计算天数差。如果没有找到（还没恢复），跳过该条。最终取平均值
- `monthlyTrend`: 最近6个月，每个月统计 `breaks.filter(b => b.date.startsWith(month)).length`

### computeHypotheticalStreak

```ts
function computeHypotheticalStreak(
  breakEntry: StreakBreakEntry,
  history: Array<{ date: string; done: boolean }>,
  graceHistory: GraceHistoryEntry[],
  quota: number,
): HypotheticalResult
```

**Rules:**
1. 计算 `breakDate` 所在月份 `breakMonth`
2. 检查 `graceHistory` 中 `breakMonth` 已使用的宽限期数量 `usedCount`
3. 检查 `graceHistory` 中是否已有 `breakDate` 的记录
4. `available = (usedCount < quota) && !hasExistingGrace`
5. 如果 `available`:
   - 从 `breakDate` 开始，向后查找 `history` 中连续 `done=true` 的天数 `consecutiveDays`
   - `hypotheticalStreak = breakEntry.lostStreak + consecutiveDays`
6. 否则: `hypotheticalStreak = 0`

### generateEncouragement

```ts
function generateEncouragement(
  breaks: StreakBreakEntry[],
  longestStreak: number,
  totalCheckinDays: number,
  currentStreak: number,
  insight: BreakInsight,
): string[]
```

**Rules (按优先级，取 2-3 条):**
1. 坚持率: `totalCheckinDays / (totalCheckinDays + sum(breaks.map(b => b.lostStreak))) * 100` → 百分比
2. 最长连胜: 如果 `longestStreak >= 3`，加入
3. 趋势改善: 如果 `monthlyTrend` 最后两个月，后 < 前，加入
4. 超越平均: 如果 `currentStreak > insight.avgStreak && currentStreak >= 3`，加入
5. 周末薄弱: 如果 `weekdayDist[5] + weekdayDist[6] > totalBreaks * 0.4`，加入
6. 兜底: 如果以上不足2条，加入通用鼓励

### getRecoveryData

```ts
function getRecoveryData(
  checkinHistory: CheckinEntry[],
  breaks: StreakBreakEntry[],
): RecoveryData
```

**Rules:**
1. 计算 `currentStreak` (从今天向前数连续 done 天数)
2. 如果 `currentStreak > 0`: state = 'active', 计算 `daysSinceLastBreak`
3. 如果今天和昨天都未打卡: state = 'just_broke', `previousStreak = breaks[0]?.lostStreak`
4. 如果今天未打卡但昨天打卡了: state = 'at_risk'
5. 如果 `daysSinceLastCheckin > 7`: state = 'long_absence'

## UI Components

### RecoveryCard

**Props:** `data: RecoveryData, onCheckin: () => void`

**Layout by state:**

| State | Icon | Title | Subtitle | Button |
|-------|------|-------|----------|--------|
| active | 🔥 | `{currentStreak} 天连胜` | `距上次中断已过 {n} 天，你正在变得更强` | — |
| just_broke | 💪 | `没关系，重新开始` | `上次连胜 {n} 天，这次可以更久` | 立即打卡 |
| at_risk | ⏳ | `别忘了今天的打卡` | `当前连胜 {n} 天，打卡保持住` | 立即打卡 |
| long_absence | 🌱 | `重新开始，永远不晚` | `距上次打卡已过 {n} 天` | 立即打卡 |

**Button action:**
- Web: `overlay.open('checkin')`
- Mobile: `navigation.navigate('Checkin')`

### InsightCard

**Props:** `insight: BreakInsight, theme, primaryColor`

**Visibility:** Only rendered when `insight.totalBreaks >= 3`

**Layout:**
```
┌────────────────────────────────────┐
│  📊 中断模式                        │
│                                    │
│  高发日                             │
│  ┌─────────────────────────────┐   │
│  │ MiniBarChart (7 bars)       │   │
│  └─────────────────────────────┘   │
│                                    │
│  平均连胜 6.2 天 · 恢复平均 1.8 天  │
│                                    │
│  趋势                              │
│  ┌─────────────────────────────┐   │
│  │ MiniBarChart (6 bars)       │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘
```

### BreakList

**Props:** `breaks: StreakBreakEntry[], hypotheticals: HypotheticalResult[]`

**Each entry:**
```
┌────────────────────────────────────┐
│  05-15  -5天  ⚠️ 假设连胜 6天      │
│  连胜范围：05-10 → 05-15           │
└────────────────────────────────────┘
```

Grace tag only shown when `hypotheticals[i].available === true`.

### EncouragementCard

**Props:** `messages: string[]`

**Layout:** Simple card with 2-3 lines of text, each on its own line.
