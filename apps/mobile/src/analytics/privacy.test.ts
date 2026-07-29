// 模拟原生模块（测试环境无原生模块）
vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn().mockResolvedValue('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'HEX' },
}));

// 模拟 db/schema（避免循环导入 + 原生模块依赖）
vi.mock('../../db/schema', () => ({
  getState: vi.fn().mockResolvedValue(null),
  setState: vi.fn().mockResolvedValue(undefined),
  openDatabaseAsync: vi.fn().mockResolvedValue({}),
}));

import { sanitize } from './privacy';

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
      const input = { description: 'x'.repeat(300), name: '短名', count: 5 };
      const output = sanitize(input);
      expect(output.description).toBeUndefined();
      expect(output.name).toBe('短名');
      expect(output.count).toBe(5);
    });

    test('递归过滤嵌套对象', () => {
      const input = {
        user: { name: 'test', email: 'a@b.com' },
        event: 'click',
      };
      const output = sanitize(input);
      expect(output).toEqual({
        user: { name: 'test' }, // email 被过滤，name 保留
        event: 'click',
      });
    });

    test('不过滤数字和布尔值', () => {
      const input = { count: 100, active: true, rate: 0.95 };
      expect(sanitize(input)).toEqual(input);
    });
  });
});
