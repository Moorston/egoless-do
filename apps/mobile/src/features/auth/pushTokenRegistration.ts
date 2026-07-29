import { registerPushToken, createLogger } from '@egoless-do/core';
import { Platform } from 'react-native';

const log = createLogger('PushToken');

const getNotifications = () => import('expo-notifications');

/**
 * Request push notification permission, obtain an Expo push token,
 * and register it with the backend. Safe to fire-and-forget.
 */
export async function registerExpoPushToken(token: string): Promise<void> {
  try {
    const Notifications = await getNotifications();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      log.info('Push permission denied');
      return;
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      log.info('No project ID configured for push');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenData?.data) {
      log.warn('No push token data returned');
      return;
    }
    registerPushToken(token, Platform.OS as 'ios' | 'android', async () => tokenData.data).catch(err => {
      log.error(err, { message: 'Failed to register push token with backend' });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('未登录') || msg.includes('401') || msg.includes('auth')) {
      log.info('Push token deferred — will retry after auth refresh');
    } else {
      log.error(err, { message: 'Failed to register push token' });
    }
  }
}
