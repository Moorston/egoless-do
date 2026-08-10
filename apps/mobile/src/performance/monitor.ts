// ─── 性能监控 ──────────────────────────────────────────────────
// Frame rate + re-render 监控（仅开发模式）

import { createLogger } from '@egoless-do/core';

const log = createLogger('Perf');

let frameCount = 0;
let lastTime = performance.now();
let monitorStarted = false;

/**
 * 启动 frame rate 监控。
 * 低于 40fps 时输出警告（每 5 秒采样一次，减少开销）。
 */
export function startFrameMonitor(): void {
  if (monitorStarted || !__DEV__) return;
  monitorStarted = true;

  const SAMPLE_INTERVAL = 5000; // 5 秒采样一次（减少开销）

  requestAnimationFrame(function loop() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= SAMPLE_INTERVAL) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fps < 40) {
        log.warn(`Low FPS: ${fps}`);
      }
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(loop);
  });
}

/**
 * 测量函数执行时间。
 */
export function measure<T>(label: string, fn: () => T): T {
  const t0 = performance.now();
  const result = fn();
  log.debug(`${label}: ${(performance.now() - t0).toFixed(1)}ms`);
  return result;
}

/**
 * 标记性能点（用于日志）。
 */
export function mark(label: string): void {
  if (__DEV__) {
    log.debug(`[Perf] ${label}: ${performance.now().toFixed(0)}ms`);
  }
}
