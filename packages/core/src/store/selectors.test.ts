import { describe, it, expect } from 'vitest';
import { calculateStreakFromCheckins } from '../utils';

describe('store/selectors', () => {
  describe('calculateStreakFromCheckins', () => {
    it('空数组应返回 0', () => {
      expect(calculateStreakFromCheckins([])).toBe(0);
    });

    it('应计算连续打卡', () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const checkins = [
        { date: today, done: true },
        { date: yesterday, done: true },
      ];
      expect(calculateStreakFromCheckins(checkins)).toBe(2);
    });

    it('应排除未打卡记录', () => {
      const today = new Date().toISOString().slice(0, 10);
      const checkins = [
        { date: today, done: false },
      ];
      expect(calculateStreakFromCheckins(checkins)).toBe(0);
    });

    it('应排除已删除记录', () => {
      const today = new Date().toISOString().slice(0, 10);
      const checkins = [
        { date: today, done: true, deleted: true },
      ];
      expect(calculateStreakFromCheckins(checkins)).toBe(0);
    });

    it('中断后应重新计算', () => {
      const today = new Date().toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
      const checkins = [
        { date: today, done: true },
        { date: twoDaysAgo, done: true }, // 昨天中断
      ];
      expect(calculateStreakFromCheckins(checkins)).toBe(1);
    });
  });

  // 以下测试需要 React 环境，仅测试纯函数
  describe('pure functions', () => {
    it('calculateStreakFromCheckins 应处理边界情况', () => {
      expect(calculateStreakFromCheckins(null as any)).toBe(0);
      expect(calculateStreakFromCheckins(undefined as any)).toBe(0);
    });
  });
});
