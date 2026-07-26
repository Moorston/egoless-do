# 调眠页首页优化 — 技术设计（收尾收敛版）

> 本文件反映代码真实结构。原始 design.md 描述的是「各 Card 独立文件」的目标结构，实际落地为「内联分段」，见 §偏离。

## 实际组件结构

```
SleepEngine.tsx (174 行 — 状态机路由，不变)
├── HomePage.tsx (434 行 — 首页全部内容 + 内联分段 + Modal)
│   ├── 分段：SleepSummaryCard / BodyClockCard / SleepGoalCard / QuickDiary / RitualEntrance / TrendChart / StreakBar
│   └── Modal：BedtimeReminder / BodyClockDetail / SleepGoalEdit / TrendDetail / DiaryModal
├── pages/SleepBarrierPage.tsx     (不变)
├── pages/SleepGratitudePage.tsx   (不变)
├── pages/SleepReportPage.tsx      (不变)
├── DiaryModal.tsx                 (不变)
├── useBarrierTimer.ts             (不变)
├── useSleepNotifications.ts       (不变)
└── sleepStyles.ts                 (共用样式)
```

## 数据流

```
用户操作 → HomePage → SleepEngine 回调 → Store Action → 持久化
                                  ↕
                           useShallowStore 选择器
```

## 关键状态（来源）

| 状态 | 来源 | 说明 |
|------|------|------|
| `todaySleep` | `getTodaySleep()` | 昨晚睡眠数据 |
| `sleepHistory` | store | 历史记录（趋势图用） |
| `sleepGoal` | store | 睡眠目标 |
| `currentPeriod` | `getCurrentPeriod()` | 当前时辰 |
| `nextSleep` | `getNextSleepPeriod()` | 下一个睡眠时辰 |
| `sleepStreak` | `SleepEngine` 内 computed | 连续记录天数 |

## 各模块实现要点（代码现状）

1. **SleepSummaryCard** — 置顶；时长大字号、质量星、🛌→☀️ 时间轴、仪轨状态徽标；点击 → `DiaryModal`。空状态提示「还没有昨晚的记录」。
2. **BodyClockCard** — 12 时辰圆点可点击 → `clockDetail` Modal（时辰名/脏腑/建议/时段）；当前时辰高亮；底部显示距下一睡眠时辰倒计时。
3. **SleepGoalCard** — 编辑按钮 → `showGoalModal`（`HH:MM` 格式校验 + 时长 clamp 1–24）→ `setSleepGoal`。
4. **QuickDiary** — 5 星评分 + 4 选 1 工作状态（`WorkState`）→ `saveSleepDiary({ quality, workState })`；「打开完整日记」→ `DiaryModal`。
5. **RitualEntrance** — 15/20/30 分钟 + 快速感恩；视觉用主题色，无独立深色背景。
6. **TrendChart** — `sleepHistory` 近 7 天；纯 `View` 柱状图，颜色随 quality/duration 变化（`barColor`）；平均时长标注；点击 → `trendDetail` Modal。
7. **StreakBar** — `sleepStreak > 0` 时显示「🔥 连续记录 X 天」。

## 视觉规范（实际采用）

| 用途 | 取值 | 说明 |
|------|------|------|
| 页面/卡片背景 | `TH.bg` / `TH.card` | 全局主题色（非 PRD 原定 `#0a0a1a`） |
| 主色 / 强调 | `TH.primary` / `#6366F1` | 主题紫 / 靛蓝 |
| 分数色 | `#F59E0B` | 金色，质量评分 |
| 成功色 | `#10B981` | 仪轨完成 |

> 注：原 design.md 指定的 `#0a0a1a` 深色背景仅保留在 `SleepBarrierPage.tsx` 与 `sleepStyles.ts`（仪轨进行中页面），首页未采用。

## 兼容性

- 已有数据：读取同样的 `sleepHistory` / `getTodaySleep()`，不受影响。
- 已有功能：仪轨 / 感恩 / 报告页面完全不变。
- 主题系统：首页沿用全局主题，未引入独立夜间模式。

## 风险点（实际评估）

| 风险 | 状态 |
|------|------|
| 趋势图性能 | 已限制 7 天 + `useMemo`，无压力 |
| 多个 Modal 叠加 | 各 Modal 独立 `useState`，互斥显示，无堆叠问题 |
| 快速日记与 DiaryModal 同步 | 统一经 `saveSleepDiary` 写入 |

## 偏离原始 design.md 的说明

- 原设计将 7 个 Card 分别做成独立组件文件；实际内联于 `HomePage.tsx`。理由：文件 434 行仍在宪法软上限内，且本任务聚焦功能落地。后续若超 500 行再按 §2.1 拆分。
- 原设计指定独立夜间深色背景；实际采用全局主题色（commit `d12171b4`）。
