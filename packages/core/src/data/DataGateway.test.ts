// ─── DataGateway contract tests ───────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoopDataGateway } from './DataGateway';

describe('DataGateway Contract', () => {
  describe('NoopDataGateway', () => {
    let gateway: NoopDataGateway;

    beforeEach(() => {
      gateway = new NoopDataGateway();
    });

    it('get returns null for any entity', async () => {
      const result = await gateway.get('test', 'id-1');
      expect(result).toBeNull();
    });

    it('list returns empty array for any entity', async () => {
      const result = await gateway.list('test');
      expect(result).toEqual([]);
    });

    it('list with filter returns empty array', async () => {
      const result = await gateway.list('test', { key: 'value' });
      expect(result).toEqual([]);
    });

    it('upsert does not throw', async () => {
      await expect(gateway.upsert('test', 'id-1', { data: 'value' })).resolves.toBeUndefined();
    });

    it('delete does not throw', async () => {
      await expect(gateway.delete('test', 'id-1')).resolves.toBeUndefined();
    });
  });
});
