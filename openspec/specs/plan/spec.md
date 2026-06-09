# Plan Module

## Data Model

### Plan

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | 计划名称 |
| goal | string | 目标描述 |
| slogan | string | 口号/座右铭 |
| startDate | string | 开始日期 (YYYY-MM-DD) |
| endDate | string | 结束日期 (YYYY-MM-DD) |
| status | PlanStatus | 当前状态 |
| progress | number | 进度百分比 (0-100) |
| lastDelayedNotifyAt | number? | 上次发送延期邮箱提醒的时间戳 |

### PlanItem

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| planId | string | 所属计划 ID |
| name | string | 任务名称 |
| description | string | 任务描述 |
| startDate / endDate | string | 任务周期 |
| link | PlanItemLink | 关联类型 |
| linkConfig | object? | 关联配置 (targetMinutes, targetHours, habitId) |
| priority | PlanItemPriority | 优先级 (high/medium/low) |
| targetMetric | string | 目标指标 |
| status | PlanItemStatus | 任务状态 |
| order | number | 排序序号 |

### PlanItemCheckin

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| planItemId | string | 所属任务 ID |
| date | string | 打卡日期 |
| done | boolean | 是否完成 |
| linkedModule | string? | 自动打卡来源模块 |

### DailyCustomTodo

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| planId | string | 所属计划 ID |
| date | string | 日期 |
| name | string | 待办名称 |
| done | boolean | 是否完成 |
| recurring | boolean? | 是否每日循环 |

### DailyTodoHistory

每日快照，记录计划任务和自定义待办的完成情况。

## Status State Machine

```
┌──────────────┐   startPlan    ┌──────────────┐
│  not_started │───────────────▶│  in_progress  │◀── resumePlan
└──────────────┘                └──────┬───────┘
       ▲                               │
       │ auto-start (startDate≤today)   │ pausePlan
       │                               ▼
       │                        ┌──────────────┐
       │                        │    paused     │
       │                        └──────┬───────┘
       │                               │
       │                cancelPlan      │ completePlan
       │               ┌───────────────┘
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│  completed   │  │  cancelled   │
└──────────────┘  └──────────────┘
```

### Auto Status Detection (`checkAutoStatus`)

- `not_started` → `in_progress`: when `startDate ≤ today` and no other active plan exists
- `in_progress` items → `delayed`: when `endDate < today`
- Delayed plans detected for email notification (once per plan via `lastDelayedNotifyAt`)

### Permissions

| Operation | Allowed States |
|-----------|---------------|
| Edit | not_started, in_progress, paused |
| Delete | not_started, cancelled |
| Pause | in_progress |
| Resume | paused (requires no other active plan) |
| Complete | in_progress, paused |
| Cancel | in_progress, paused |

**Single Active Plan Rule**: At most one plan can be `in_progress` or `paused` at a time. Starting/resuming a plan is blocked if another active plan exists.

## Link Types

| Link | Description | Sync Behavior |
|------|-------------|---------------|
| manual | 手动打卡 | User checks in manually |
| checkin | 每日打卡 | Auto-synced from CheckinEntry |
| fasting | 禁食 | Auto-synced from FastingSession |
| meditation | 冥想 | Auto-synced from MedHistoryEntry |
| exercise | 锻炼 | Auto-synced from ExerciseEntry |
| habit | 习惯 | Auto-synced from Habit (requires linkConfig.habitId) |
| reflection | 感念 | Linked via reflectionId field |

### Link Sync (store `syncPlanItemCheckins`)

For each active plan item with a non-manual link, the store checks if the linked module has activity on each date. If activity exists, a PlanItemCheckin with `done: true` and `linkedModule` is created. This runs on every store update via a field-level change detection comparator (replaced JSON.stringify for performance).

## Daily Reset (`performDailyReset`)

Triggered on date change (app foreground or periodic check):

1. **Auto-start tasks**: Run `checkAutoStatus` to transition states
2. **Save history**: For each active plan, save previous day's snapshot to DailyTodoHistory
3. **Copy recurring todos**: For each active plan, copy `recurring: true` custom todos from previousDate to today (if not already present)

## Recurring Custom Todos

- `DailyCustomTodo.recurring` field marks a todo as daily-recurring
- During `performDailyReset`, recurring todos are copied from the previous day to today
- UI provides a toggle button (Repeat icon) when adding custom todos
- Recurring badge shown on todo items in both mobile and web

## Progress Computation

### Plan Progress

Time-based: `elapsed / totalDays * 100` where:
- `totalDays = endDate - startDate + 1`
- `elapsed = min(today, endDate) - startDate + 1`

### Item Progress

Checkin-based: `doneCount / totalDays * 100` where:
- `totalDays` = item duration
- `doneCount` = checkins with `done: true` within item date range (clamped to today)

## Relation Map

Mobile-only feature (web pending). Navigates to a visual map showing connections between:
- Plan items ↔ Reflections (via linkedPlanItemId)
- Plan items ↔ Thought Trails (via reflectionIds)
- Plan items ↔ Habits (via linkConfig.habitId)

## i18n

Plan module uses dedicated i18n keys prefixed with `plan` (e.g., `planName`, `planGoal`, `planItems`). Key categories:
- Status labels: `planStatusNotStarted`, `planStatusInProgress`, etc.
- Link labels: `planLinkManual`, `planLinkCheckin`, etc.
- Operations: `planStart`, `planPause`, `planResume`, `planComplete`, `planCancelPlan`
- Todo section: `planTodoToday`, `planTodoHistory`, `planTodoDone`, `planDailyCustomTodos`
- Relation map: `planRelationMap`, `planRelationMapDesc`, `planLinkedContent`
