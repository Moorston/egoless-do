import { describe, it, expect } from 'vitest';
import { sanitize } from '../analytics/privacy';
import { anonymizeUserId } from '../analytics/privacy';

describe('analytics/privacy', () => {
  describe('sanitize', () => {
    it('保留安全字段', () => {
      const input = { habit_name: '冥想', streak_day: 5, category: 'health' };
      expect(sanitize(input)).toEqual(input);
    });

    it('删除 PII 黑名单字段', () => {
      const input = {
        habit_name: '冥想',
        content: '今天的感悟...',
        email: 'user@example.com',
        mood: '平静',
        weight: 65.5,
        tags: ['tag1'],
      };
      const output = sanitize(input);
      expect(output.habit_name).toBe('冥想');
      expect(output.content).toBeUndefined();
      expect(output.email).toBeUndefined();
      expect(output.mood).toBeUndefined();
      expect(output.weight).toBeUndefined();
      expect(output.tags).toBeUndefined();
    });

    it('删除超长字符串（防泄露笔记）', () => {
      const input = { note: 'x'.repeat(300), name: '短名' };
      const output = sanitize(input);
      expect(output.note).toBeUndefined();
      expect(output.name).toBe('短名');
    });

    it('递归过滤嵌套对象', () => {
      const input = {
        user: { name: 'test', email: 'a@b.com' },
        event: 'click',
      };
      const output = sanitize(input);
      expect(output).toEqual({
        user: { name: 'test' },
        event: 'click',
      });
    });

    test('不过滤数字和布尔值', () => {
      const input = { count: 100, active: true, rate: 0.95 };
      expect(sanitize(input)).toEqual(input);
    });

    test('处理空对象', () => {
      expect(sanitize({})).toEqual({});
    });

    test('处理 null/undefined 值', () => {
      const input = { a: null, b: undefined, c: 'valid' };
      expect(sanitize(input)).toEqual({ a: null, b: undefined, c: 'valid' });
    });
  });

  describe('anonymizeUserId', () => {
    test('应返回 16 位十六进制字符串', async () => {
      const result = await anonymizeUserId('user-123');
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    test('相同输入应产生相同输出', async () => {
      const a = await anonymizeUserId('user-123');
      const b = await anonymizeUserId('user-123');
      expect(a).toBe(b);
    });

    test('不同输入应产生不同输出', async () => {
      const a = await anonymizeUserId('user-123');
      const b = await anonymizeUserId('user-456');
      expect(a).not.toBe(b);
    });

    test('空字符串应返回有效哈希', async () => {
      const result = await anonymizeUserId('');
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });
  });
});
