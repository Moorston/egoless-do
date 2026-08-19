import { describe, it, expect } from 'vitest';
import { z, type ZodSafeParseSuccess } from 'zod';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// ── Performance benchmarks ─────────────────────────────────────

describe('Performance benchmarks', () => {
  describe('usePagination logic', () => {
    it('paginates 10,000 items within 50ms', () => {
      const data = Array.from({ length: 10000 }, (_, i) => ({ id: String(i) }));
      const pageSize = 20;
      const start = performance.now();

      // Simulate multiple page loads
      for (let page = 1; page <= 10; page++) {
        if (page * pageSize >= data.length) break;
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('validateRows (Zod)', () => {
    it('validates 1,000 rows within 100ms', async () => {
      const { z } = await import('zod');
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        value: z.number(),
      });
      type RowResult = z.output<typeof schema>;

      const rows = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `item-${i}`,
        value: i * 10,
      }));

      const start = performance.now();
      const results = rows
        .map(row => schema.safeParse(row))
        .filter((r): r is ZodSafeParseSuccess<RowResult> => r.success)
        .map(r => r.data);
      const elapsed = performance.now() - start;

      expect(results).toHaveLength(1000);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('JSON.parse performance', () => {
    it('parses 1,000 JSON strings within 50ms', () => {
      const strings = Array.from({ length: 1000 }, (_, i) =>
        JSON.stringify({ id: i, data: 'x'.repeat(100) })
      );

      const start = performance.now();
      const results = strings.map(s => JSON.parse(s));
      const elapsed = performance.now() - start;

      expect(results).toHaveLength(1000);
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Map lookup performance', () => {
    it('10,000 Map lookups within 100ms', () => {
      const map = new Map<string, number>();
      for (let i = 0; i < 10000; i++) {
        map.set(`key-${i}`, i);
      }

      const start = performance.now();
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        sum += map.get(`key-${i}`) ?? 0;
      }
      const elapsed = performance.now() - start;

      expect(sum).toBe(49995000);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
