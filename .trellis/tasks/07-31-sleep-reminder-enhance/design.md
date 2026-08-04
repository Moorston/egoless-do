# 技术设计 — 睡觉提醒全维度优化

## 1. 概述

四维度升级：全屏 UI、多阶段策略、交互增强、通知内容。

## 2. 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     HomePage.tsx                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SleepGoalCard → [编辑] → EditGoalModal               │  │
│  │    (bedtime / wake / weekendBedtime / wake / stages)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  BedtimeReminderModal (全屏)                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  呼吸月亮 SVG                                    │  │  │
│  │  │  时辰名 + 脏腑 + 建议                            │  │  │
│  │  │  环形进度条 (60s)                               │  │  │
│  │  │  [开始仪轨] [15分] [20分] [30分]               │  │  │
│  │  │  [稍后提醒] [跳过今晚]                          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               useSleepNotifications.ts                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  scheduleReminders()                                  │  │
│  │    ├─ 智能跳过：已睡眠？→ return                      │  │
│  │    ├─ 周末？→ 使用 weekendBedtime                     │  │
│  │    └─ 遍历 reminderStages → scheduleNotificationAsync │  │
│  │         + 准时提醒                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  NotificationReceivedListener                         │  │
│  │    └─ 前台 → setShowBedtimeModal(true)                │  │
│  │       └─ 启动 60s 自动记录定时器                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  snooze()                                             │  │
│  │    └─ 10min 后单次提醒                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  skipTonight()                                        │  │
│  │    └─ 取消今晚所有剩余提醒                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Store 扩展

### 3.1 SleepGoal 类型

```ts
interface SleepGoal {
  targetBedtime: string;        // "HH:MM"
  targetWake: string;           // "HH:MM"
  targetHours: number;
  enabled: boolean;
  reminderBeforeMin: number;    // 保留向后兼容

  // 新增
  weekendBedtime?: string;      // 周末目标入睡 "HH:MM"
  weekendWake?: string;         // 周末目标起床 "HH:MM"
  reminderStages?: number[];    // 提醒阶段 [30, 15, 5]（分钟）
}
```

### 3.2 DEFAULT_SLEEP_GOAL

```ts
export const DEFAULT_SLEEP_GOAL: SleepGoal = {
  targetBedtime: '23:00',
  targetWake: '07:00',
  targetHours: 8,
  enabled: false,
  reminderBeforeMin: 30,
  reminderStages: [30, 15, 5],
};
```

## 4. 全屏 Modal 组件

### 4.1 BedtimeReminderModal 接口

```ts
interface Props {
  visible: boolean;
  bedtime: string;              // "HH:MM"
  period: BodyClockPeriod;      // 当前时辰
  onStartRitual: (min: number) => void;  // 快速开始仪轨
  onSnooze: () => void;         // 稍后提醒
  onSkipTonight: () => void;    // 跳过今晚
  onDismiss: () => void;        // 关闭（自动记录）
}
```

### 4.2 布局结构

```
╔════════════════════════════════╗
║  (SafeAreaView dark bg)        ║
║                                ║
║       ╭──────────╮             ║
║       │ 呼吸月亮  │  ← Animated ║
║       │  (SVG)   │    4s 周期  ║
║       ╰──────────╯             ║
║                                ║
║        子时 · 胆经             ║
║     阳气初生，宜入睡            ║
║                                ║
║    ╭──────────────────╮        ║
║    │ ◠◡◠◡ 环形进度条    │        ║
║    │    45s           │        ║
║    ╰──────────────────╯        ║
║                                ║
║  ┌──────────────────────────┐  ║
║  │    🌙 开始睡眠仪轨 →      │  ║  ← 主 CTA
║  └──────────────────────────┘  ║
║                                ║
║  ┌──────┐ ┌──────┐ ┌──────┐   ║
║  │ 15分钟│ │ 20分钟│ │ 30分钟│   ║  ← 快速仪轨
║  └──────┘ └──────┘ └──────┘   ║
║                                ║
║  [ 稍后提醒 ]    [ 跳过今晚 ]   ║  ← 辅助操作
║                                ║
╚════════════════════════════════╝
```

### 4.3 呼吸动画

```ts
const breathe = useRef(new Animated.Value(1)).current;
useEffect(() => {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(breathe, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ]),
  );
  loop.start();
  return () => loop.stop();
}, []);
```

### 4.4 环形进度条（60s 倒计时）

- 使用 react-native-svg 绘制
- 背景环（灰色）+ 进度环（主色，strokeDasharray 动画）
- 中心显示秒数

## 5. useSleepNotifications 升级

### 5.1 scheduleReminders（重写）

```ts
const scheduleReminders = useCallback(async () => {
  if (!sleepGoal.enabled) return;
  const Notifications = getNotifications();
  await cancelReminders();

  // 智能跳过：已记录睡眠 → return
  const todaySleep = getTodaySleep();
  if (todaySleep) return;

  const granted = await requestPermissions();
  if (!granted) return;

  // 判断周末
  const isWeekend = [0, 6].includes(new Date().getDay());
  const bedtime = (isWeekend && sleepGoal.weekendBedtime)
    ? sleepGoal.weekendBedtime
    : sleepGoal.targetBedtime;

  const [bedHour, bedMin] = bedtime.split(':').map(Number);
  const stages = sleepGoal.reminderStages ?? [sleepGoal.reminderBeforeMin];

  // 阶段提醒
  stages.forEach((minBefore, idx) => {
    let rHour = bedHour;
    let rMin = bedMin - minBefore;
    if (rMin < 0) { rHour = (rHour - 1 + 24) % 24; rMin += 60; }

    const period = getPeriodForHour(rHour);
    const stageLabel = getStageLabel(minBefore);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌙 ${stageLabel}距离${period.nameZh}入睡还有 ${minBefore} 分钟`,
        body: `${period.organ}当令，${period.advice}`,
        data: { type: 'sleep-reminder', stage: minBefore },
      },
      trigger: { type: DAILY, hour: rHour, minute: rMin },
      identifier: `sleep-reminder-${minBefore}`,
    });
  });

  // 准时提醒
  const period = getPeriodForHour(bedHour);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🌙 现在是 ${bedtime}，该入睡了`,
      body: `${period.organ}当令，${period.advice}`,
      data: { type: 'sleep-bedtime' },
    },
    trigger: { type: DAILY, hour: bedHour, minute: bedMin },
    identifier: 'sleep-reminder-bedtime',
  });
}, [sleepGoal, getTodaySleep, ...]);
```

### 5.2 Snooze

```ts
const snooze = useCallback(async () => {
  const Notifications = getNotifications();
  const snoozeCount = ...; // 从 store 读取/写入
  if (snoozeCount >= 3) return; // 最多 3 次

  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 再次提醒：该入睡了',
      body: '点击开始睡眠仪轨',
      data: { type: 'sleep-snooze' },
    },
    trigger: { type: DATE, timestamp: now.getTime() },
    identifier: 'sleep-snooze',
  });

  setShowBedtimeModal(false);
  // snoozeCount + 1
}, [...]);
```

### 5.3 skipTonight

```ts
const skipTonight = useCallback(async () => {
  const Notifications = getNotifications();
  // 取消所有已调度的睡前提醒
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const sleepNotifs = pending.filter(n =>
    n.identifier.startsWith('sleep-reminder') || n.identifier === 'sleep-snooze'
  );
  await Promise.all(sleepNotifs.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  setShowBedtimeModal(false);
}, [...]);
```

## 6. 通知内容策略

### 6.1 阶段化文案

| 阶段 | 标题 | 正文 |
|------|------|------|
| 30min | 🌙 距离子时入睡还有 30 分钟 | 胆经当令，宜准备放下手机，调整呼吸 |
| 15min | 🌙 距离子时入睡还有 15 分钟 | 胆经当令，宜放下手机，准备入睡 |
| 5min | ⏰ 距离子时入睡还有 5 分钟 | 胆经当令，请立即放下手机，准备仪轨 |
| 准时 | 🌙 现在是 23:00，该入睡了 | 胆经当令，阳气初生，宜入睡 |

### 6.2 Deep Link

通知 data 增加 `deepLink: 'sleep'`，在通知响应监听中解析并导航。

## 7. EditGoalModal 扩展

在现有睡眠目标弹窗中增加：
- 周末目标入睡/起床时间（可选）
- 提醒阶段多选（15/30/60 分钟）

## 8. 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `packages/core/src/types/sleep.ts` | 修改 | SleepGoal 新增字段 |
| `packages/core/src/business/sleep.ts` | 修改 | DEFAULT_SLEEP_GOAL |
| `apps/mobile/src/features/sleep/useSleepNotifications.ts` | 重写 | 多阶段 + Snooze + skipTonight |
| `apps/mobile/src/features/sleep/components/BedtimeReminderModal.tsx` | 新增 | 全屏沉浸 Modal |
| `apps/mobile/src/features/sleep/HomePage.tsx` | 修改 | 集成新 Modal + EditGoalModal 扩展 |

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 通知权限未授予 | 提醒不触发 | 保持现有权限请求流程 |
| 多通知 ID 冲突 | 旧提醒残留 | schedule 前先 cancelReminders |
| 周末判断时区 | 周末提醒时间错误 | 使用本地时间 getDay() |
| Snooze 次数无限 | 用户被反复骚扰 | 限制 3 次/晚 |
| 自动记录误触发 | 用户未睡但被记录 | 保留"忽略"按钮 + 60s 缓冲 |

## 10. 验证策略

- 手动测试：设置 bedtime 为当前 +2min，验证提醒触发
- 单元测试：新建 `useSleepNotifications.test.ts` 覆盖调度逻辑
- 集成测试：验证 deep link 跳转
