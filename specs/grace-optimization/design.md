# Grace Period Optimization — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│                                                             │
│  GracePage ──▶ CheckinModal(graceDate) ──▶ submitCheckin    │
│      │                                                      │
│      ├─ QuotaProgress                                        │
│      ├─ QuotaSetting                                         │
│      ├─ GraceTimeline                                        │
│      └─ StreakPending (HomeScreen)                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Store Layer                            │
│                                                             │
│  CheckinSlice                                               │
│    ├─ submitCheckin(done, note, date?, weight?, grace?)     │
│    ├─ addGraceRecord(date)  [with duplicate guard]          │
│    └─ calculateStreak()                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     Business Layer                          │
│                                                             │
│  checkin.ts: submitCheckinEntry(..., grace)                 │
│  grace.ts:   getMonthGraceCount, getRemainingGrace,         │
│              isGraceAvailable                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│                                                             │
│  CheckinEntry { grace?: boolean }                           │
│  GraceHistoryEntry { date, restoredAt }                     │
│  UserProfile { graceMonthlyQuota?: number }                 │
│                                                             │
│  SQLite: checkin_history + grace column                     │
│  PocketBase: checkins JSON includes grace field             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Grace Checkin Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  GracePage   │────▶│ CheckinModal │────▶│   Store      │
│              │     │ (graceDate)  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
  1. Check quota      2. Load yesterday   3. submitCheckin
     available            state               (grace=true)
       │                    │                    │
       │                    │              4. addGraceRecord
       │                    │                    │
       │               5. User fills        6. Persist
       │                  checkin               │
       │                    │                    │
       │               7. Submit ───────────────┘
       │                    │
       ◀────────────────────┘
       │
  8. Show success
  9. Update timeline
```

## CheckinModal Grace Mode

```
┌─────────────────────────────────────────────┐
│  ⚠️ 宽限期补卡 · 2026-06-08                │
│  为昨天完成打卡，标记为补卡天                  │
├─────────────────────────────────────────────┤
│                                             │
│  [未完成]              [已完成]              │
│                                             │
│  ┌─ 修行 & 待办 ─────────────────────────┐  │
│  │  ☐ 打坐    ☐ 站桩    ☐ 诵经          │  │
│  │  ☐ 计划任务 1                         │  │
│  │  ☐ 习惯 A                             │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ 数据 ────────────────────────────────┐  │
│  │  体重: [65] kg                         │  │
│  │  (饮水/食物区块隐藏)                    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ 感念 ────────────────────────────────┐  │
│  │  [记录此刻的感悟...]                    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [提交补卡]                                  │
│                                             │
└─────────────────────────────────────────────┘

提交后:
  - 不弹出 CheckinReflection
  - 直接返回 GracePage
  - GracePage 显示成功动画
```

## GracePage Layout

```
┌─────────────────────────────────────────────┐
│  ← 宽限期恢复                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ 状态卡 ───────────────────────────────┐ │
│  │                                        │ │
│  │  昨天未打卡时:                          │ │
│  │  🛡️  昨天忘记打卡了？                   │ │
│  │      补卡保持连胜                       │ │
│  │                                        │ │
│  │  [✓ 开始补卡]  ← 打开 CheckinModal     │ │
│  │                                        │ │
│  │  配额不足时:                            │ │
│  │  ⚠️  本月宽限次数已用完 (2/2)           │ │
│  │      下月重置                           │ │
│  │                                        │ │
│  │  昨天已打卡时:                          │ │
│  │  ✅ 昨天已打卡，无需补卡                 │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 配额进度 ─────────────────────────────┐ │
│  │  本月已用: 1/2 次                       │ │
│  │  ████████░░░░░░░░                      │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 配额设置 ─────────────────────────────┐ │
│  │  每月宽限次数                            │ │
│  │  [0] [1] [2*] [3] [4] [5]             │ │
│  │         ▲ 当前                          │ │
│  │  设为 0 可完全禁用宽限期                 │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 补卡记录 ─────────────────────────────┐ │
│  │  ● 2026-06-05  补卡  14:32            │ │
│  │    连胜维持: 12 天                      │ │
│  │                                        │ │
│  │  ● 2026-05-15  补卡  09:15            │ │
│  │    连胜维持: 8 天                       │ │
│  │                                        │ │
│  │  ● 2026-04-02  补卡  22:01            │ │
│  │    连胜维持: 3 天                       │ │
│  │                                        │ │
│  │  (空态: 暂无补卡记录)                    │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 说明 ─────────────────────────────────┐ │
│  │  宽限期机制：中断1天内补打卡，连胜不断。  │ │
│  │  补卡需要完成实际的修行打卡。             │ │
│  └────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

## Heatmap Design

```
Normal checkin:     Grace checkin:      Missed:
┌──────────┐       ┌ ─ ─ ─ ─ ─ ┐      ┌──────────┐
│██████████│       │░░░░░░░░░░░│      │          │
│██████████│       │░░░░░░░░░░░│      │          │
└──────────┘       └ ─ ─ ─ ─ ─ ┘      └──────────┘
solid fill          dashed border       gray
primary color       + semi-transparent   background
                    primary color

Implementation:
  style={{
    borderStyle: isGrace ? 'dashed' : 'solid',
    borderWidth: isGrace ? 2 : 0,
    borderColor: primaryColor,
    backgroundColor: isGrace ? `${primaryColor}66` : primaryColor,
  }}
```

## Streak Pending State (HomeScreen)

```
Normal streak:          At risk (grace available):     Broken:
┌───────────────┐      ┌───────────────┐              ┌───────────────┐
│  🔥 15 天连胜  │      │  ⚠️ 连胜待定   │              │               │
│               │      │  补卡保持连胜   │              │  (no display) │
└───────────────┘      └───────────────┘              └───────────────┘
                       tap → GracePage

Logic:
  const isStreakAtRisk = useMemo(() => {
    if (streak === 0) return false;
    const yStr = yesterday();
    const yesterdayDone = checkinHistory.some(c => c.date === yStr && c.done);
    if (yesterdayDone) return false;
    return isGraceAvailable(graceHistory, quota, currentMonth, yStr);
  }, [streak, checkinHistory, graceHistory, quota]);
```

## Implementation Order

```
Phase 1: Data Layer (no UI changes)
  1. types/checkin.ts — add grace field
  2. types/app.ts — add graceMonthlyQuota
  3. business/grace.ts — new utility functions
  4. business/checkin.ts — add grace param
  5. store/createCheckinSlice.ts — pass through + guard
  6. SQLite migration — add grace column
  7. entityTableMap — add grace mapping

Phase 2: GracePage Redesign
  8. i18n — add new keys
  9. GracePage.tsx (mobile) — full redesign
  10. GracePage.tsx (web) — same

Phase 3: CheckinModal Grace Mode
  11. CheckinModal.tsx (mobile) — graceDate prop
  12. CheckinModal (web) — same

Phase 4: Visualization
  13. HomeScreen — streak pending state
  14. Heatmap — dashed border
  15. Checkin history — grace badge
```
