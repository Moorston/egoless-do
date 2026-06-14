## 1. 数据模型

- [x] 1.1 修改 `packages/core/src/types/habit.ts`：Habit 接口新增 `alarmEnabled`、`alarmHour`、`alarmMinute` 字段
- [x] 1.2 修改 `packages/core/src/defaults.ts`：`createHabitFromForm` 添加新字段默认值（false, 8, 0）

## 2. 通知服务

- [x] 2.1 扩展 `NotificationService.ts`：新增 `scheduleHabitReminder(habit)` 函数，调度每日重复通知
- [x] 2.2 新增 `cancelHabitReminder(notificationId)` 函数（备用）
- [x] 2.3 新增 `rescheduleAllHabitReminders(habits)` 函数：取消全部 → 重调度启用中的习惯
- [x] 2.4 通知标题 = 习惯名，正文 = "该打卡了！已连续 {streak} 天"

## 3. 通知点击跳转

- [x] 3.1 `navigation/index.tsx` 添加 `addNotificationResponseReceivedListener`
- [x] 3.2 解析通知 data 中的 `habitId`，导航到 `HabitDetail` 页面

## 4. 习惯创建/编辑表单

- [x] 4.1 `HabitsScreen.tsx` 创建表单新增提醒 Toggle + 时间选择器
- [x] 4.2 编辑模式回显当前提醒设置
- [x] 4.3 保存时将提醒字段写入 Habit

## 5. 习惯详情页

- [x] 5.1 `HabitDetailScreen.tsx` 新增提醒设置卡片（显示时间 + 开关）
- [x] 5.2 点击卡片可编辑提醒（弹出时间选择器）
- [x] 5.3 修改后保存并更新通知调度

## 6. i18n

- [x] 6.1 添加翻译 key：habitAlarm、habitAlarmTime、habitAlarmEnabled 等（zh/en/zh-Hant）
