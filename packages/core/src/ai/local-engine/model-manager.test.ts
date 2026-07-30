import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelManager } from './model-manager';

describe('ModelManager', () => {
  let manager: ModelManager;

  beforeEach(() => {
    manager = new ModelManager();
  });

  it('should return null for checkForUpdate when no model', async () => {
    const update = await manager.checkForUpdate('nonexistent');
    expect(update).toBeNull();
  });

  it('should return false for downloadModel when model unavailable', async () => {
    const result = await manager.downloadModel('nonexistent', '1.0.0');
    expect(result).toBe(false);
  });

  it('should return null for getCurrentVersion initially', () => {
    expect(manager.getCurrentVersion('test')).toBeNull();
  });

  it('should rollback to no version', async () => {
    await manager.rollback('test');
    expect(manager.getCurrentVersion('test')).toBeNull();
  });

  it('should compare versions correctly', async () => {
    // @ts-ignore - 访问私有方法进行测试
    const compare = manager.compareVersions.bind(manager);
    expect(compare('1.2.3', '1.2.3')).toBe(0);
    expect(compare('1.2.4', '1.2.3')).toBeGreaterThan(0);
    expect(compare('1.2.2', '1.2.3')).toBeLessThan(0);
    expect(compare('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });
});
