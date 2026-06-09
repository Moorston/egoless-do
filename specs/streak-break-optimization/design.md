# Streak Break Page — Technical Design

## Architecture Overview

```
packages/core/src/utils.ts          ← 新增纯函数
    │
    ├── computeBreakInsights()      ← 洞察分析
    ├── computeHypotheticalStreak() ← 假设连胜
    └── generateEncouragement()     ← 动态文案
            │
            ▼
┌─────────────────────────────────────────────┐
│  StreakBreakPage (web) / StreakBreakScreen (mobile)  │
│                                             │
│  ┌─────────────┐  recovery state machine    │
│  │ RecoveryCard │─────────────────────────── │
│  └─────────────┘                            │
│  ┌─────────────┐  hidden if breaks < 3      │
│  │ InsightCard  │────────────────────────── │
│  └─────────────┘                            │
│  ┌─────────────┐                            │
│  │  BreakList   │  each entry + grace tag   │
│  └─────────────┘                            │
│  ┌─────────────┐                            │
│  │ Encouragement│  data-driven messages     │
│  └─────────────┘                            │
└─────────────────────────────────────────────┘
```

## Data Flow

### Store → Page

```ts
// StreakBreakPage needs from store:
const checkinHistory = store.checkinHistory;     // CheckinEntry[]
const graceHistory = store.graceHistory;          // GraceHistoryEntry[]
const quota = store.userProfile?.graceMonthlyQuota ?? 2;
const currentMonth = dateStr().slice(0, 7);
const today = dateStr();

// Derived:
const breaks = detectStreakBreaks(checkinHistory);
const doneDates = checkinHistory.filter(c => c.done).map(c => c.date);
const longestStreak = computeLongestStreak(doneDates);
const currentStreak = computeCurrentStreak(checkinHistory);  // 已有或需新增
const insight = computeBreakInsights(breaks);
const encouragement = generateEncouragement(breaks, longestStreak, doneDates.length, currentStreak, insight);
```

### Recovery State Machine

```ts
type RecoveryState = 'active' | 'just_broke' | 'at_risk' | 'long_absence';

function getRecoveryState(
  checkinHistory: CheckinEntry[],
  currentStreak: number,
): { state: RecoveryState; data: Record<string, number> } {
  const today = dateStr();
  const yesterday = /* yesterday date string */;
  const todayDone = checkinHistory.some(c => c.date === today && c.done);
  const yesterdayDone = checkinHistory.some(c => c.date === yesterday && c.done);

  if (currentStreak > 0) {
    // 计算距上次中断的天数
    return { state: 'active', data: { currentStreak, daysSinceLastBreak: /* ... */ } };
  }

  if (!todayDone && !yesterdayDone) {
    // 刚中断：找上一个break的lostStreak
    const breaks = detectStreakBreaks(checkinHistory);
    const lastBreak = breaks[0]; // newest
    return { state: 'just_broke', data: { previousStreak: lastBreak?.lostStreak ?? 0 } };
  }

  if (!todayDone && yesterdayDone) {
    return { state: 'at_risk', data: { currentStreak } };
  }

  // 7天以上未打卡
  const lastDoneDate = /* ... */;
  const daysSince = daysBetween(lastDoneDate, today);
  if (daysSince > 7) {
    return { state: 'long_absence', data: { daysSince } };
  }

  return { state: 'active', data: { currentStreak } };
}
```

## New Utility Functions

### computeBreakInsights

```ts
export interface BreakInsight {
  weekdayDist: number[];    // [7] 索引0=周一, 6=周日
  monthDist: number[];      // [12] 索引0=1月, 11=12月
  avgStreak: number;        // 平均连胜天数 (保留1位小数)
  avgRecoveryDays: number;  // 中断后平均恢复天数
  totalBreaks: number;
  monthlyTrend: { month: string; count: number }[];  // 近6月
}

export function computeBreakInsights(
  breaks: StreakBreakEntry[],
  history: Array<{ date: string; done: boolean }>,
): BreakInsight {
  // weekdayDist: 对每个break，breakDate的星期几 +1
  // monthDist: 对每个break，breakDate的月份 +1
  // avgStreak: sum(lostStreak) / breaks.length
  // avgRecoveryDays: 对每个break，计算breakDate到下一个doneDate的天数差
  // monthlyTrend: 最近6个月，每个月的break数量
}
```

### computeHypotheticalStreak

```ts
export function computeHypotheticalStreak(
  breakEntry: StreakBreakEntry,
  history: Array<{ date: string; done: boolean }>,
  graceHistory: GraceHistoryEntry[],
  quota: number,
  currentMonth: string,
): { available: boolean; hypotheticalStreak: number } {
  // 1. 检查breakDate前一天的宽限期状态
  //    - 当月已用宽限期 < quota?
  //    - 当天没有已存在的grace记录?
  // 2. 如果available:
  //    - 从breakDate开始，向后数连续done的天数
  //    - hypotheticalStreak = lostStreak + 连续done天数
  // 3. 返回 { available, hypotheticalStreak }
}
```

### generateEncouragement

```ts
export function generateEncouragement(
  breaks: StreakBreakEntry[],
  longestStreak: number,
  totalCheckinDays: number,
  currentStreak: number,
  insight: BreakInsight,
): string[] {
  // 返回 2-3 条动态文案
  // 优先级: 坚持率 > 最长连胜 > 趋势改善 > 超越平均 > 周末提醒 > 兜底
}
```

## i18n Keys

```ts
// 新增 keys
streakBreakRecovery: string;        // 恢复卡片标题
streakBreakActiveStreak: string;    // "当前连胜 {n} 天"
streakBreakDaysSince: string;       // "距上次中断已过 {n} 天"
streakBreakGettingStronger: string; // "你正在变得更强"
streakBreakRestart: string;         // "没关系，重新开始"
streakBreakPrevStreak: string;      // "上次连胜 {n} 天"
streakBreakCanBeLonger: string;     // "这次可以更久"
streakBreakDontForget: string;      // "别忘了今天的打卡"
streakBreakNeverTooLate: string;    // "重新开始，永远不晚"
streakBreakCheckinNow: string;      // "立即打卡"
streakBreakInsight: string;         // "中断模式"
streakBreakHighDay: string;         // "高发日"
streakBreakAvgStreak: string;       // "平均连胜"
streakBreakAvgRecovery: string;     // "恢复平均"
streakBreakTrend: string;           // "趋势"
streakBreakHypothetical: string;    // "假设连胜 {n} 天"
streakBreakGraceHint: string;       // "可用宽限期未使用"
streakBreakEncouragement: string;   // "鼓励"
streakBreakPersistence: string;     // "连续打卡 {n} 天，坚持率 {rate}%"
streakBreakProved: string;          // "你的最长连胜 {n} 天，证明你做得到"
streakBreakImproving: string;       // "本月中断比上月减少，你在进步"
streakBreakSurpassed: string;       // "当前连胜已超过你的平均"
streakBreakWeekendWeak: string;     // "周末是你的薄弱时段"
```

## Component Structure

### Web: StreakBreakPage.tsx

```tsx
export default function StreakBreakPage({ onClose }) {
  // store hooks
  // useMemo: breaks, insight, encouragement, recoveryState

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <Header />
        <RecoveryCard state={recoveryState} onCheckin={handleCheckin} />
        {breaks.length >= 3 && <InsightCard insight={insight} />}
        <BreakList breaks={breaks} /* with hypothetical tags */ />
        <EncouragementCard messages={encouragement} />
      </div>
    </div>
  );
}
```

### Mobile: StreakBreakScreen.tsx

Same structure, using React Native components (SafeAreaView, ScrollView, Card, etc.).

## Mini Bar Chart Implementation

Simple div/View based, no chart library:

```tsx
function MiniBarChart({ values, labels, maxHeight = 40 }: { values: number[]; labels: string[]; maxHeight?: number }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: maxHeight + 20 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', height: (v / max) * maxHeight,
            background: v === max ? P : `${P}40`,
            borderRadius: 3, minHeight: v > 0 ? 2 : 0,
          }} />
          <span style={{ fontSize: 10, color: TH.sub }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
```

Weekday labels: `['一', '二', '三', '四', '五', '六', '日']`

Month labels: last 6 months in `M月` format.
