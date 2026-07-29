import { sanitize, type AnalyticsConsent } from '../privacy';

describe('analytics/privacy', () => {
  describe('sanitize', () => {
    test('保留安全字段', () => {
      const input = { habit_name: '冥想', streak_day: 5, category: 'health' };
      expect(sanitize(input)).toEqual(input);
    });

    test('删除 PII 黑名单字段', () => {
      const input = {
        habit_name: '冥想',
        content: '今天的感悟...',
        email: 'user@example.com',
        mood: '平静',
        weight: 65.5,
      };
      const output = sanitize(input);
      expect(output.habit_name).toBe('冥想');
      expect(output.content).toBeUndefined();
      expect(output.email).toBeUndefined();
      expect(output.mood).toBeUndefined();
      expect(output.weight).toBeUndefined();
    });

    test('删除超长字符串（防泄露笔记）', () => {
      const input = { note: 'x'.repeat(300), name: '短名' };
      const output = sanitize(input);
      expect(output.note).toBeUndefined();
      expect(output.name).toBe('短名');
    });

    test('递归过滤嵌套对象', () => {
      const input = {
        user: { name: 'test', email: 'a@b.com' },
        event: 'click',
      };
      const output = sanitize(input);
      expect(output).toEqual({
        user: {}, // name 和 email 都被过滤
        event: 'click',
      });
    });

    test('不过滤数字和布尔值', () => {
      const input = { count: 100, active: true, rate: 0.95 };
      expect(sanitize(input)).toEqual(input);
    });
  });
});
