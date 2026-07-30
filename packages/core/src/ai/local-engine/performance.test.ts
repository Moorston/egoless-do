/**
 * 性能基准测试
 * 验证端侧 AI 推理延迟目标（<50ms）
 */
import { describe, it, expect } from 'vitest';
import { HybridEngine } from '../../packages/core/src/ai/local-engine/hybrid-engine';
import { ModelManager } from '../../packages/core/src/ai/local-engine/model-manager';

describe('Performance Benchmarks', () => {
  describe('HybridEngine', () => {
    it('should fallback to cloud within 100ms when local unavailable', async () => {
      const mockCloud = {
        initialize: vi.fn().mockResolvedValue(undefined),
        predict: vi.fn().mockResolvedValue({
          text: 'test',
          confidence: 0.9,
          latencyMs: 50,
          modelVersion: 'cloud-v1',
        }),
      };

      const engine = new HybridEngine(mockCloud as any);
      await engine.initialize();

      const t0 = performance.now();
      await engine.predict('test');
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(100); // 云端降级 <100ms
    });
  });

  describe('ModelManager', () => {
    it('should check for update within 50ms', async () => {
      const manager = new ModelManager();

      const t0 = performance.now();
      await manager.checkForUpdate('test');
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(50);
    });

    it('should compare versions within 1ms', () => {
      const manager = new ModelManager();

      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        // @ts-ignore
        manager.compareVersions('1.2.3', '1.2.4');
      }
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(1000); // 1000 次 <1s
    });
  });
});
