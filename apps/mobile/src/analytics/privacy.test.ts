import { describe, it, expect } from 'vitest';
import { sanitize } from '../analytics/privacy';

describe('analytics/privacy', () => {
  describe('sanitize', () => {
    test('保留安全字段', () => {
      const input = { habit_name: '冥想', streak_day: 5 };
      expect(sanitize(input)).toEqual(input);
    });

    test('删除 PII 黑名单字段', () => {
      const input = { name: 'test', email: 'a@b.com', content: '笔记' };
      expect(sanitize(input)).toEqual({ name: 'test' });
    });

    test('删除超长字符串', () => {
      const input = { note: 'x'.repeat(300) };
      expect(sanitize(input)).toEqual({});
    });
  });

  describe('anonymizeUserId', () => {
    test('应返回 16 位十六进制字符串', async () => {
      const { anonymizeUserId } = await import('../analytics/privacy');
      const result = await anonymizeUserId('user-123');
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    test('相同输入应产生相同输出', async () => {
      const { anonymizeUserId } = await import('../analytics/privacy');
      const a = await anonymizeUserId('user-123');
      const b = await anonymizeUserId('user-123');
      expect(a).toBe(b);
    });
  });
});
