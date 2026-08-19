// ─── PostHog 性能事件追踪 ──────────────────────────────────────
// 追踪关键性能指标，用于监控和告警。

import { Events } from './events';
import { track } from './track';

/**
 * 追踪应用启动时间。
 * 应在 initApp() 完成后调用。
 */
export function trackAppStart(durationMs: number): void {
  track('app_start_time', {
    duration_ms: durationMs,
    platform: getPlatform(),
  });
}

/**
 * 追踪列表帧率。
 * 应在列表滚动时采样调用。
 */
export function trackListFPS(fps: number, screenName: string): void {
  track('list_fps', {
    fps: Math.round(fps),
    screen: screenName,
  });
}

/**
 * 追踪同步延迟。
 * 应在 SyncEngine.runSync() 完成后调用。
 */
export function trackSyncLatency(durationMs: number, entityCount: number): void {
  track('sync_latency', {
    duration_ms: durationMs,
    entity_count: entityCount,
  });
}

/**
 * 追踪 AI 功能使用。
 */
export function trackAIUsage(feature: string, latencyMs: number, model: string): void {
  track(Events.AI_FEATURE_USED, {
    feature,
    latency_ms: latencyMs,
    model,
  });
}

function getPlatform(): string {
  try {
    const rn = require('react-native') as { Platform: { OS: string } };
    return rn.Platform.OS;
  } catch {
    return 'unknown';
  }
}
