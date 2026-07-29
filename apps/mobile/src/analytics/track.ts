// ─── 统一埋点 API ───────────────────────────────────────────────
// 所有埋点调用集中于此，自动做 PII 过滤。

import { getPostHog } from './posthog';
import { sanitize } from './privacy';
import type { AnalyticsEvent } from './events';

/**
 * 追踪自定义事件。
 * @param event - 事件名（使用 Events 常量）
 * @param props - 事件属性（自动 PII 过滤）
 */
export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(event, sanitize(props));
}

/**
 * 用户识别（匿名化 ID）。
 * @param userId - 匿名化后的用户 ID
 * @param properties - 用户属性（自动 PII 过滤）
 */
export function identify(userId: string, properties: Record<string, unknown> = {}): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.identify(userId, sanitize(properties));
}

/**
 * 页面浏览追踪。
 * @param screenName - 页面名
 * @param props - 额外属性
 */
export function screen(screenName: string, props: Record<string, unknown> = {}): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.screen(screenName, sanitize(props));
}

/**
 * 设置用户属性（一次性，如语言、主题）。
 */
export function setPersonProperties(properties: Record<string, unknown>): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.register(sanitize(properties));
}

/**
 * 手动刷新队列（app background 时调用）。
 */
export async function flush(): Promise<void> {
  const ph = getPostHog();
  if (!ph) return;
  await ph.flush();
}
