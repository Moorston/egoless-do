// ─── PostHog SDK 初始化 ─────────────────────────────────────────
// 单例模式：initPostHog() 一次，getPostHog() 全局获取。

import PostHog, { type PostHogOptions } from 'posthog-react-native';

import { getAnalyticsConsent, setAnalyticsConsent } from './privacy';

let posthogInstance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

export interface PostHogConfig {
  apiKey: string;
  host: string;
  sessionReplay?: boolean;
}

/**
 * 初始化 PostHog SDK。
 * - 检查用户同意状态（denied → 返回 null）
 * - 单例：多次调用返回同一实例
 * - 离线队列：20 事件或 30 秒批量发送
 */
export async function initPostHog(config: PostHogConfig): Promise<PostHog | null> {
  if (posthogInstance) return posthogInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const consent = await getAnalyticsConsent();
      if (consent === 'denied') {
        return null;
      }

      const options: PostHogOptions = {
        host: config.host,
        sessionReplay: config.sessionReplay ?? false,
        captureNativeAppLifecycle: true,
        captureNativeAppEvents: true,
        flushAt: 20,
        flushInterval: 30000,
        // 自托管时禁用 IP 地理定位
        captureIP: false,
      };

      // PostHog 是类，需用 new 实例化
      posthogInstance = new PostHog(config.apiKey, options);
      return posthogInstance;
    } catch (err) {
      console.warn('[Analytics] PostHog init failed:', err);
      return null;
    }
  })();

  return initPromise;
}

/**
 * 获取 PostHog 实例。
 * 未初始化或用户拒绝时返回 null。
 */
export function getPostHog(): PostHog | null {
  return posthogInstance;
}

/**
 * 用户同意追踪（从设置页调用）。
 */
export async function optIn(): Promise<void> {
  if (posthogInstance) {
    await posthogInstance.optIn();
  }
}

/**
 * 用户拒绝追踪（从设置页调用）。
 */
export async function optOut(): Promise<void> {
  if (posthogInstance) {
    await posthogInstance.optOut();
  }
}

/**
 * 重置实例（测试用）。
 */
export function resetPostHog(): void {
  posthogInstance = null;
  initPromise = null;
}
