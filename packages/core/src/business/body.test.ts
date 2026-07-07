import { describe, it, expect } from 'vitest';
import { calcBMI, calcBMR, calcGoalProgress, recommendStrategy, createBodyGoal } from './body';

// ─── calcBMI ──────────────────────────────────────────────────
describe('calcBMI', () => {
  it('calculates BMI correctly', () => {
    // 70kg / (1.75m)^2 = 22.9
    expect(calcBMI(70, 175)).toBe(22.9);
  });

  it('returns 0 for zero weight', () => {
    expect(calcBMI(0, 175)).toBe(0);
  });

  it('returns 0 for zero height', () => {
    expect(calcBMI(70, 0)).toBe(0);
  });

  it('returns 0 for negative inputs', () => {
    expect(calcBMI(-1, 175)).toBe(0);
    expect(calcBMI(70, -1)).toBe(0);
  });
});

// ─── calcBMR ──────────────────────────────────────────────────
describe('calcBMR', () => {
  it('calculates BMR for male', () => {
    // Mifflin-St Jeor: 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
    expect(calcBMR(70, 175, 30, 'male')).toBe(1649);
  });

  it('calculates BMR for female', () => {
    // 10*55 + 6.25*160 - 5*25 - 161 = 550 + 1000 - 125 - 161 = 1264
    expect(calcBMR(55, 160, 25, 'female')).toBe(1264);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calcBMR(0, 175, 30, 'male')).toBe(0);
    expect(calcBMR(70, 0, 30, 'male')).toBe(0);
    expect(calcBMR(70, 175, 0, 'male')).toBe(0);
  });
});

// ─── calcGoalProgress ─────────────────────────────────────────
describe('calcGoalProgress', () => {
  it('returns 100 when goal reached', () => {
    expect(calcGoalProgress(70, 70, 80)).toBe(100);
  });

  it('returns 0 at starting point', () => {
    expect(calcGoalProgress(80, 70, 80)).toBe(0);
  });

  it('returns 50 at halfway', () => {
    expect(calcGoalProgress(75, 70, 80)).toBe(50);
  });

  it('caps at 100', () => {
    expect(calcGoalProgress(65, 70, 80)).toBe(100); // past goal
  });

  it('returns 0 for null inputs', () => {
    expect(calcGoalProgress(undefined, 70, 80)).toBe(0);
    expect(calcGoalProgress(70, undefined, 80)).toBe(0);
    expect(calcGoalProgress(70, 70, undefined)).toBe(0);
  });

  it('returns 100 when initial equals target', () => {
    expect(calcGoalProgress(70, 70, 70)).toBe(100);
  });
});

// ─── recommendStrategy ────────────────────────────────────────
describe('recommendStrategy', () => {
  it('recommends gain_muscle for thin tags', () => {
    expect(recommendStrategy(['偏瘦'])).toBe('gain_muscle');
    expect(recommendStrategy(['上肢弱'])).toBe('gain_muscle');
  });

  it('recommends lose_fat for overweight', () => {
    expect(recommendStrategy(['偏胖'])).toBe('lose_fat');
  });

  it('recommends posture for neck/back issues', () => {
    expect(recommendStrategy(['颈椎'])).toBe('posture');
    expect(recommendStrategy(['腰酸'])).toBe('posture');
  });

  it('recommends recovery for fatigue tags', () => {
    expect(recommendStrategy(['体虚'])).toBe('recovery');
    expect(recommendStrategy(['乏力', '气短'])).toBe('recovery');
  });

  it('returns null for unknown tags', () => {
    expect(recommendStrategy(['健康'])).toBeNull();
    expect(recommendStrategy([])).toBeNull();
  });
});

// ─── createBodyGoal ───────────────────────────────────────────
describe('createBodyGoal', () => {
  it('creates a goal with defaults', () => {
    const goal = createBodyGoal({});
    expect(goal.id).toBeDefined();
    expect(goal.targetDate).toBe('');
    expect(goal.note).toBe('');
    expect(goal.deleted).toBe(false);
  });

  it('creates a goal with provided values', () => {
    const goal = createBodyGoal({ targetWeight: 70, strategy: 'lose_fat', note: 'test' });
    expect(goal.targetWeight).toBe(70);
    expect(goal.strategy).toBe('lose_fat');
    expect(goal.note).toBe('test');
  });
});
