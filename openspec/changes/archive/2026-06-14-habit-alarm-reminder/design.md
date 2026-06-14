## Context

习惯系统（Habit）当前支持创建、打卡、暂停/恢复、放弃等操作，但缺乏定时提醒能力。全局打卡提醒（scheduleDailyReminder）只支持一个固定时间，无法按习惯独立设置。expo-notifications 已集成，支持 scheduled notifications 和 notification actions。

## Goals / Non-Goals

**Goals:**
- 每个习惯可设置一个固定时间的每日提醒
- 提醒与习惯状态联动（暂停→取消，恢复→重调度）
- 点击通知跳转习惯详情页
- 创建习惯时内嵌提醒设置

**Non-Goals:**
- 不支持多个提醒 / 间隔提醒
- 不需要后端同步（纯本地通知）
- 不涉及 Web 端

## Decisions

### 1. 数据模型：Habit 新增本地字段

在 `Habit` 接口新增三个字段：

```typescript
alarmEnabled: boolean;   // 是否开启提醒
alarmHour: number;       // 0-23
alarmMinute: number;     // 0-59
```

不加 `notificationId` 字段——expo-notifications 的 scheduled notification ID 在 app 重启后可能失效，改用 `cancelAllScheduledNotifications` + 重新调度所有启用的习惯提醒来保证一致性。

**替代方案**: 存储 notificationId 精确取消 → 放弃，因为 ID 不可靠。

### 2. 通知调度策略：启动时批量重调度

app 启动时（或习惯列表变化时），遍历所有 `alarmEnabled && status === 'inProgress'` 的习惯，重新调度通知。

```typescript
// 启动时调用
async function rescheduleAllHabitReminders(habits: Habit[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const h of habits) {
    if (h.alarmEnabled && h.status === 'inProgress') {
      await scheduleHabitReminder(h);
    }
  }
  // 重新调度全局打卡提醒
  await scheduleDailyReminder(globalHour, globalMinute);
}
```

**理由**: 简单可靠，避免维护 notificationId 映射。

### 3. 通知内容

```
标题: 习惯名（如"早起冥想"）
正文: "该打卡了！已连续 {streak} 天"
```

### 4. 通知点击行为：打开习惯详情页

在 `navigation/index.tsx` 中添加 `addNotificationResponseReceivedListener`，解析通知 data 中的 `habitId`，导航到 `HabitDetail` 页面。

### 5. 状态联动矩阵

| 状态变更 | 提醒行为 | alarmEnabled |
|---------|---------|-------------|
| 创建(开启) | schedule | → true |
| 创建(不开启) | 不操作 | → false |
| 暂停 | 不操作（启动时重调度会跳过） | 保留 true |
| 恢复 | 不操作（启动时重调度会覆盖） | 保留 true |
| 完成/放弃/删除 | 不操作（启动时重调度会跳过） | 保留 |

不在每次状态变更时精确操作通知——依赖启动时批量重调度，简化逻辑。

### 6. UI：创建表单内嵌

在习惯创建/编辑表单的"自动标签"开关下方，添加：
- 提醒开关（Toggle）
- 时间选择器（开关开启时显示，默认 08:00）

### 7. UI：详情页提醒卡片

在习惯详情页"习惯信息"卡片下方，添加提醒设置卡片，显示当前提醒时间和开关状态，可编辑。

## Risks / Trade-offs

- **风险**: expo-notifications 本地通知数量限制（iOS ~64）→ **缓解**: 习惯数量远低于此限制
- **风险**: 通知 ID 在系统重启后可能丢失 → **缓解**: 启动时批量重调度
- **风险**: 用户关闭系统通知权限 → **缓解**: 创建提醒时检查权限，引导开启
