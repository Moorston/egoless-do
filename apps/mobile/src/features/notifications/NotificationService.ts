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
      }),
    });
    handlerSet = true;
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  ensureHandler();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();
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

export async function cancelAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  ensureHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();
}
