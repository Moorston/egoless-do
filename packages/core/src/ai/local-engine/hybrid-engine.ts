// ─── HybridEngine（端侧 + 云端降级）──────────────────────────────
// 优先使用端侧推理，失败时自动降级到云端。

import { LocalAIEngine, AIResult } from './types';
import { CloudAIEngine } from '../ai-service';

export class HybridEngine {
  private localEngine: LocalAIEngine | null = null;
  private cloudEngine: CloudAIEngine;
  private useLocal: boolean = true;

  constructor(cloudEngine: CloudAIEngine) {
    this.cloudEngine = cloudEngine;
  }

  async initialize(): Promise<void> {
    // 1. 尝试初始化端侧引擎
    try {
      const { createLocalEngine } = require('./types');
      this.localEngine = await createLocalEngine('meditation-suggestion');
      if (this.localEngine) {
        const ready = await this.localEngine.initialize();
        if (!ready) {
          console.log('[HybridEngine] Local AI unavailable, using cloud only');
          this.localEngine = null;
        }
      }
    } catch {
      console.log('[HybridEngine] Local AI init failed, using cloud only');
      this.localEngine = null;
    }

    // 2. 初始化云端引擎（始终可用）
    await this.cloudEngine.initialize();
  }

  async predict(input: string): Promise<AIResult> {
    // 1. 优先使用端侧（低延迟）
    if (this.useLocal && this.localEngine?.isReady()) {
      try {
        const t0 = performance.now();
        const result = await this.localEngine.predict(input);
        result.latencyMs = performance.now() - t0;
        if (result.confidence > 0.6) {
          return result;  // 端侧结果可信
        }
      } catch (err) {
        console.warn('[HybridEngine] Local predict failed, falling back to cloud');
      }
    }

    // 2. 降级到云端
    return this.cloudEngine.predict(input);
  }

  /**
   * 禁用端侧推理（用户可选）
   */
  disableLocal(): void {
    this.useLocal = false;
    this.localEngine = null;
  }

  /**
   * 启用端侧推理
   */
  async enableLocal(): Promise<boolean> {
    this.useLocal = true;
    if (!this.localEngine) {
      try {
        const { createLocalEngine } = require('./types');
        this.localEngine = await createLocalEngine('meditation-suggestion');
        if (this.localEngine) {
          await this.localEngine.initialize();
        }
      } catch {
        return false;
      }
    }
    return this.localEngine?.isReady() ?? false;
  }

  isLocalReady(): boolean {
    return this.localEngine?.isReady() ?? false;
  }
}
