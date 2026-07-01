const getNotifications = () => import('expo-notifications');

let handlerSet = false;
async function ensureHandler() {
  if (handlerSet) return;
  try {
    const Notifications = await getNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
      } as any),
    });
    handlerSet = true;
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = await getNotifications();
    await ensureHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('Notification permission request failed:', e);
    return false;
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '心流纪 · 今日打卡',
      body:  '别忘了记录今天的修行与感念 🌿',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Habit alarm reminders ──────────────────────────────────────

interface HabitForReminder {
  id: string;
  name: string;
  streak: number;
  alarmEnabled: boolean;
  alarmHour: number;
  alarmMinute: number;
}

export async function scheduleHabitReminder(habit: HabitForReminder): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: habit.name,
      body: `该打卡了！已连续 ${habit.streak} 天`,
      sound: true,
      data: { habitId: habit.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: habit.alarmHour,
      minute: habit.alarmMinute,
    },
  });
}

export async function rescheduleAllHabitReminders(
  habits: HabitForReminder[],
  globalHour?: number,
  globalMinute?: number,
): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Re-schedule enabled habits
  for (const h of habits) {
    if (h.alarmEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: h.name,
          body: `该打卡了！已连续 ${h.streak} 天`,
          sound: true,
          data: { habitId: h.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h.alarmHour,
          minute: h.alarmMinute,
        },
      });
    }
  }

  // Re-schedule global daily reminder
  if (globalHour != null && globalMinute != null) {
    await scheduleDailyReminder(globalHour, globalMinute);
  }
}

export async function cancelAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();
}
