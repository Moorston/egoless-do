## Why

习惯系统目前只有全局打卡提醒，无法为单个习惯设置定时提醒。用户需要在特定时间收到提醒来执行习惯（如每天 8:00 冥想），缺乏提醒机制导致习惯容易遗忘。

## What Changes

- Habit 类型新增 `alarmEnabled`、`alarmHour`、`alarmMinute` 字段（本地存储，不同步后端）
- NotificationService 新增 `scheduleHabitReminder()` / `cancelHabitReminder()` 支持按习惯调度通知
- 创建习惯表单内嵌提醒设置（开关 + 时间选择器）
- 习惯详情页显示/编辑提醒设置
- 习惯状态联动：暂停→取消提醒，恢复→重新调度，完成/放弃/删除→取消提醒
- 点击通知 → 打开习惯详情页

## Non-Goals

- 不支持多个提醒（一个习惯一个提醒）
- 不支持间隔提醒 / 位置提醒
- 不需要 PocketBase migration（纯本地字段）
- 不涉及 Web 端改动

## Capabilities

### New Capabilities

- `habit-alarm`: 习惯闹钟提醒能力——数据模型、通知调度、状态联动、UI 设置

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **Mobile**: `apps/mobile/src/features/habits/`、`apps/mobile/src/features/notifications/`、`apps/mobile/src/navigation/`
- **Core**: `packages/core/src/types/habit.ts`、`packages/core/src/defaults.ts`、`packages/core/src/store/createHabitSlice.ts`
- **依赖**: expo-notifications（已有）
