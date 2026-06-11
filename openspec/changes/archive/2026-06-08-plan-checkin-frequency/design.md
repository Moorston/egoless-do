## Context

当前 `PlanItem` 的打卡模型是"每天打卡"：日期范围内每一天都是期望打卡日，进度 = 已打卡天数 / 总天数。这无法满足以下场景：
- 运动：一周 3 次
- 冥想：隔天一次
- 诵经：每月初一、十五

需要在不破坏现有数据兼容性的前提下，引入灵活的打卡频率机制。

## Goals / Non-Goals

**Goals:**
- 支持六种打卡频率模式，覆盖常见修行场景
- 进度计算自动适配频率，分母不再是固定总天数
- 每日待办只显示当天需要打卡的任务
- 任务卡片显示频率摘要和可展开的任务级热力图
- 向后兼容：未设置频率的任务默认为"每天"

**Non-Goals:**
- 不支持 cron 表达式或复杂排程
- 不支持补打卡
- 不支持按小时打卡
- 频率是 per-item，不是 per-plan

## Decisions

### D1: 频率类型使用联合类型（Discriminated Union）

```typescript
export type CheckinFrequency =
  | { mode: 'daily' }
  | { mode: 'interval'; every: number }
  | { mode: 'weekly'; target: number }
  | { mode: 'weekly_fixed'; days: number[] }
  | { mode: 'monthly'; target: number }
  | { mode: 'monthly_fixed'; dates: number[] };
```

**理由**: 联合类型在 TypeScript 中类型安全，模式间互斥，序列化为 JSON 存储简单。

**替代方案**: 用多个可选字段（frequencyType + frequencyValue + frequencyDays），但容易出现非法组合。

### D2: 进度计算的"期望天数"按模式分支

每种模式有独立的 `computeExpectedDays` 逻辑：

| 模式 | 期望天数计算 |
|------|-------------|
| daily | `daysBetween(start, clamped) + 1` |
| interval | `floor(已过天数 / every) + 1` |
| weekly | `fullWeeks × target + ceil(剩余天/7 × target)` |
| weekly_fixed | 命中星期几的天数 |
| monthly | `fullMonths × target + ceil(剩余天/月天数 × target)` |
| monthly_fixed | 命中日期的天数 |

**理由**: 每种模式的"期望"含义不同，分支计算最清晰。

### D3: 每日待办过滤逻辑

`getTodayItems` 增加 `checkins` 参数，根据频率决定是否显示：

| 模式 | 显示条件 |
|------|---------|
| daily | 始终显示 |
| interval | 今天是周期第一天 且 本周期未打过 |
| weekly/monthly | 本周期未达标 |
| weekly_fixed | 今天是指定星期几 |
| monthly_fixed | 今天是指定日期 |

**关键**: `interval` 模式的周期从 `startDate` 起算，每 `every` 天为一个周期。只有周期第一天显示任务，打完即隐藏。

### D4: 首个不完整周期的处理

如果 `startDate` 不在周期边界（如周五开始，每周 4 次），首个不完整周期按实际剩余天数计算期望：

```
startDate=周五, weekly(4)
第0周(不完整): 周五~周日 = 3天, 期望 = min(3, 4) = 3
第1周(完整): 周一~周日 = 7天, 期望 = 4
```

### D5: 编辑规则

- `not_started` 任务：可修改频率（全部字段）
- `in_progress` 任务：不可编辑，只能删除重建
- 删除后重算 plan progress
- 修改频率后调用 `refreshPlanItemStats` 重算进度

### D6: 热力图组件复用

提取 `HeatmapGrid` 基础组件，plan 级热力图和 item 级热力图共享网格渲染逻辑：

```
HeatmapGrid
├── weeks: (string | null)[][]
├── getCellColor: (date) => string | null
├── cellSize?: number
└── showLabels?: boolean
```

- Plan 级: `getCellColor` 基于 rateMap（完成率 0~1，4 色）
- Item 级: `getCellColor` 基于 doneSet（二值，2 色：绿/灰）

### D7: 频率选择器 UI

表单中频率选择器使用水平滚动 chips + 条件展开配置区：

```
[每天] [间隔] [每周] [每周固定] [每月] [每月固定]
```

选择后展开对应配置：
- interval → 数字输入 "每 N 天"
- weekly → 数字输入 "每周 N 次"
- weekly_fixed → 7 个 toggle 按钮（日~六）
- monthly → 数字输入 "每月 N 次"
- monthly_fixed → 日期多选（1~31）

### D8: 频率摘要在任务卡片中的显示

进度条下方新增一行，左侧显示频率摘要，右侧显示热力图展开按钮：

```
[████████░░] 80%  12 打卡天数
📅 一  三  五                    [📊 ▼]
```

- daily 模式不显示摘要（默认行为，节省空间）
- 其他模式显示图标 + 摘要文字
- 热力图默认收起，点击展开显示单任务打卡记录

## Risks / Trade-offs

**[R1] 弹性模式的进度分母可能误导用户**
→ 每周 3 次模式下，如果用户第一周打了 5 次，进度可能超过 100%。需要 clamp 到 100%，或考虑是否允许"超额"。

**[R2] 频率修改后历史进度重算**
→ 修改频率会导致进度数字跳变。仅允许 `not_started` 状态修改可缓解此问题。

**[R3] 月度模式的边界处理**
→ 月份天数不一致（28~31天），`monthly_fixed` 的日期如 31 号在小月不存在。需要跳过不存在的日期。

**[R4] 向后兼容**
→ 现有 PlanItem 没有 frequency 字段，默认视为 `daily`。数据库 migration 添加 nullable TEXT 列即可。
