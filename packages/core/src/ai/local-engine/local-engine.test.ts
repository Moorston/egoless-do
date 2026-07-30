import { describe, it, expect, vi } from 'vitest';
import { OnnxEngine } from './onnx-engine';
import { CoreMLEngine } from './coreml-engine';

describe('LocalAIEngine', () => {
  describe('OnnxEngine (placeholder)', () => {
    it('should initialize as not ready', async () => {
      const engine = new OnnxEngine('test-model');
      const ready = await engine.initialize();
      expect(ready).toBe(false);
      expect(engine.isReady()).toBe(false);
    });

    it('should throw on predict (not implemented)', async () => {
      const engine = new OnnxEngine('test-model');
      await expect(engine.predict('input')).rejects.toThrow('not implemented');
    });

    it('should return null for checkForUpdate', async () => {
      const engine = new OnnxEngine('test-model');
      const update = await engine.checkForUpdate();
      expect(update).toBeNull();
    });

    it('should return false for downloadModel', async () => {
      const engine = new OnnxEngine('test-model');
      const result = await engine.downloadModel('1.0.0');
      expect(result).toBe(false);
    });
  });

  describe('CoreMLEngine (placeholder)', () => {
    it('should initialize as not ready', async () => {
      const engine = new CoreMLEngine('test-model');
      const ready = await engine.initialize();
      expect(ready).toBe(false);
    });

    it('should throw on predict (not implemented)', async () => {
      const engine = new CoreMLEngine('test-model');
      await expect(engine.predict('input')).rejects.toThrow('not implemented');
    });
  });
});
