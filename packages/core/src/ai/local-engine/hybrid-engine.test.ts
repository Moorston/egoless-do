import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridEngine } from './hybrid-engine';

// ── Mocks ──
const mockCloudPredict = vi.fn().mockResolvedValue({
  text: '云端建议',
  confidence: 0.9,
  latencyMs: 500,
  modelVersion: 'cloud-v1',
});

const mockCloudEngine = {
  initialize: vi.fn().mockResolvedValue(undefined),
  predict: mockCloudPredict,
};

describe('HybridEngine', () => {
  let engine: HybridEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new HybridEngine(mockCloudEngine as any);
  });

  it('should initialize with cloud engine', async () => {
    await engine.initialize();
    expect(mockCloudEngine.initialize).toHaveBeenCalled();
  });

  it('should fallback to cloud when local unavailable', async () => {
    await engine.initialize();
    const result = await engine.predict('冥想建议');
    expect(mockCloudPredict).toHaveBeenCalled();
    expect(result.text).toBe('云端建议');
  });

  it('should disable local inference', async () => {
    await engine.initialize();
    engine.disableLocal();
    expect(engine.isLocalReady()).toBe(false);
  });

  it('should enable local inference', async () => {
    await engine.initialize();
    const result = await engine.enableLocal();
    // 占位实现返回 false
    expect(result).toBe(false);
  });
});
