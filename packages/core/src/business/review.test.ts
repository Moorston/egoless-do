// ─── Review business logic tests ───────────────────────────────
import { describe, it, expect } from 'vitest';
import { 
  getWeekRange, 
  getMonthRange, 
  calculateReviewData,
  buildReviewPrompt,
  parseReviewAIResponse 
} from './review';
import type { CheckinEntry, Habit, Plan, PlanItem, FoodEntry, ExerciseEntry, FastingSession, MedHistoryEntry, GraceHistoryEntry } from '../types';

describe('getWeekRange', () => {
  it('should return Monday to Sunday for a Wednesday', () => {
    // 2026-06-10 is Wednesday
    const date = new Date('2026-06-10T00:00:00');
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-06-08'); // Monday
    expect(range.end).toBe('2026-06-14');   // Sunday
  });

  it('should return Monday to Sunday for a Sunday', () => {
    // 2026-06-14 is Sunday
    const date = new Date('2026-06-14T00:00:00');
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-06-08'); // Monday
    expect(range.end).toBe('2026-06-14');   // Sunday
  });

  it('should return Monday to Sunday for a Monday', () => {
    // 2026-06-08 is Monday
    const date = new Date('2026-06-08T00:00:00');
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-06-08'); // Monday
    expect(range.end).toBe('2026-06-14');   // Sunday
  });
});

describe('getMonthRange', () => {
  it('should return first day to last day of June', () => {
    const date = new Date('2026-06-15T00:00:00');
    const range = getMonthRange(date);
    expect(range.start).toBe('2026-06-01');
    expect(range.end).toBe('2026-06-30');
  });

  it('should return first day to last day of February (non-leap year)', () => {
    const date = new Date('2026-02-15T00:00:00');
    const range = getMonthRange(date);
    expect(range.start).toBe('2026-02-01');
    expect(range.end).toBe('2026-02-28');
  });

  it('should return first day to last day of February (leap year)', () => {
    const date = new Date('2024-02-15T00:00:00');
    const range = getMonthRange(date);
    expect(range.start).toBe('2024-02-01');
    expect(range.end).toBe('2024-02-29');
  });
});

describe('calculateReviewData', () => {
  const mockCheckinHistory: CheckinEntry[] = [
    { date: '2026-06-08', done: true, note: '{"practices":["sit","stand"],"water":2000}', streak: 1, weight: 70, timestamp: Date.now(), updatedAt: Date.now(), deleted: false },
    { date: '2026-06-09', done: true, note: '{"practices":["sit"],"water":1800}', streak: 2, weight: 69.5, timestamp: Date.now(), updatedAt: Date.now(), deleted: false },
    { date: '2026-06-10', done: false, note: '{"incompleteReason":"time"}', streak: 0, timestamp: Date.now(), updatedAt: Date.now(), deleted: false },
    { date: '2026-06-11', done: true, note: '{"practices":["sit","stand","chant"],"water":2200}', streak: 1, weight: 69, timestamp: Date.now(), updatedAt: Date.now(), deleted: false },
  ];

  const mockHabits: Habit[] = [
    { id: 'h1', name: '早睡', startDate: '2026-06-01', targetDays: 21, goal: '', insight: '', createTag: false, doneDays: 10, streak: 3, interrupted: 0, status: 'inProgress', checkedDates: ['2026-06-08', '2026-06-09', '2026-06-11'], pauseReason: '', abandonReason: '', alarmEnabled: false, alarmHour: 7, alarmMinute: 0, link: 'none', updatedAt: Date.now(), deleted: false },
    { id: 'h2', name: '冥想', startDate: '2026-06-01', targetDays: 21, goal: '', insight: '', createTag: false, doneDays: 5, streak: 1, interrupted: 0, status: 'inProgress', checkedDates: ['2026-06-11'], pauseReason: '', abandonReason: '', alarmEnabled: false, alarmHour: 7, alarmMinute: 0, link: 'none', updatedAt: Date.now(), deleted: false },
  ];

  const mockPlans: Plan[] = [
    { id: 'p1', name: '学习计划', goal: '学习React', slogan: '', progress: 0, status: 'in_progress', startDate: '2026-06-01', endDate: '2026-06-30', updatedAt: Date.now(), deleted: false },
  ];

  const mockPlanItems: PlanItem[] = [
    { id: 'pi1', planId: 'p1', name: '学习Hooks', description: '', contentUrl: '', totalCheckinDays: 0, progress: 0, link: 'manual', priority: 'medium', targetMetric: '', order: 0, status: 'completed', startDate: '2026-06-01', endDate: '2026-06-15', updatedAt: Date.now(), deleted: false },
    { id: 'pi2', planId: 'p1', name: '学习Context', description: '', contentUrl: '', totalCheckinDays: 0, progress: 0, link: 'manual', priority: 'medium', targetMetric: '', order: 0, status: 'in_progress', startDate: '2026-06-01', endDate: '2026-06-30', updatedAt: Date.now(), deleted: false },
  ];

  it('should calculate completion rate correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.completionRate).toBe(75); // 3 done out of 4 days in range
    expect(result.doneDays).toBe(3);
    expect(result.totalDays).toBe(4); // 4 days with checkin data in range
  });

  it('should calculate streak days correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.streakDays).toBe(1); // Only 2026-06-11 is done consecutively from end
  });

  it('should calculate habit progress correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.habitProgress).toHaveLength(2);
    
    const habit1 = result.habitProgress.find(h => h.id === 'h1');
    expect(habit1?.name).toBe('早睡');
    expect(habit1?.doneDays).toBe(3); // 3 days in range
    expect(habit1?.status).toBe('inProgress');
    
    const habit2 = result.habitProgress.find(h => h.id === 'h2');
    expect(habit2?.name).toBe('冥想');
    expect(habit2?.doneDays).toBe(1); // 1 day in range
  });

  it('should calculate plan progress correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.planProgress).toHaveLength(1);
    expect(result.planProgress[0].planName).toBe('学习计划');
    expect(result.planProgress[0].completedItems).toBe(1);
    expect(result.planProgress[0].totalItems).toBe(2);
    expect(result.planProgress[0].progress).toBe(50);
  });

  it('should calculate incomplete reasons correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.incompleteReasons).toHaveLength(1);
    expect(result.incompleteReasons[0].code).toBe('time');
    expect(result.incompleteReasons[0].count).toBe(1);
    expect(result.incompleteReasons[0].percentage).toBe(100);
  });

  it('should calculate metrics correctly', () => {
    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
    });

    expect(result.metrics.avgWeight).toBe(69.5); // (70 + 69.5 + 69) / 3
    expect(result.metrics.weightChange).toBe(-1); // 69 - 70
    expect(result.metrics.avgWater).toBe(2000); // (2000 + 1800 + 2200) / 3
  });

  it('should calculate comparison correctly when previous review exists', () => {
    const previousReview = {
      id: 'prev',
      period: 'week' as const,
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      completionRate: 60,
      doneDays: 4,
      totalDays: 7,
      streakDays: 2,
      longestStreak: 3,
      incompleteReasons: [],
      incompleteItems: [],
      habitProgress: [],
      planProgress: [],
      metrics: { avgWeight: 70, avgWater: 1800 },
      comparison: { completionRateDiff: 0, streakDiff: 0 },
      aiSummary: '',
      highlights: [],
      improvements: [],
      generatedAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
    };

    const result = calculateReviewData({
      period: 'week',
      targetDate: '2026-06-11',
      checkinHistory: mockCheckinHistory,
      habits: mockHabits,
      plans: mockPlans,
      planItems: mockPlanItems,
      foodLog: [],
      exerciseLog: [],
      fastingHistory: [],
      medHistory: [],
      graceHistory: [],
      previousReview,
    });

    expect(result.comparison.completionRateDiff).toBe(15); // 75 - 60
    expect(result.comparison.streakDiff).toBe(-1); // 1 - 2
    expect(result.comparison.weightDiff).toBe(-0.5); // 69.5 - 70
  });
});

describe('buildReviewPrompt', () => {
  it('should build prompt with all data', () => {
    const reviewData = {
      period: 'week' as const,
      startDate: '2026-06-08',
      endDate: '2026-06-14',
      completionRate: 80,
      doneDays: 4,
      totalDays: 5,
      streakDays: 3,
      longestStreak: 4,
      incompleteReasons: [
        { code: 'time', icon: '⏰', count: 2, percentage: 100 },
      ],
      incompleteItems: [
        { type: 'practice' as const, name: '早睡', count: 2 },
      ],
      habitProgress: [
        { id: 'h1', name: '早睡', doneDays: 4, targetDays: 5, progress: 80, streak: 3, status: 'inProgress' as const },
      ],
      planProgress: [
        { planId: 'p1', planName: '学习计划', totalItems: 5, completedItems: 4, progress: 80 },
      ],
      metrics: {
        avgWeight: 70,
        weightChange: -1,
        avgWater: 2000,
        avgCalories: 1500,
        totalExerciseMin: 120,
        totalExerciseKm: 10,
      },
      comparison: {
        completionRateDiff: 10,
        streakDiff: 2,
        weightDiff: -1,
      },
      generatedAt: Date.now(),
      lastAutoUpdateAt: '2026-06-14',
    };

    const prompt = buildReviewPrompt(reviewData);

    expect(prompt).toContain('周复盘');
    expect(prompt).toContain('2026-06-08 - 2026-06-14');
    expect(prompt).toContain('80%');
    expect(prompt).toContain('4/5天');
    expect(prompt).toContain('3天');
    expect(prompt).toContain('+10%');
    expect(prompt).toContain('早睡');
    expect(prompt).toContain('学习计划');
    expect(prompt).toContain('70kg');
    expect(prompt).toContain('2000ml');
  });

  it('should handle missing optional data', () => {
    const reviewData = {
      period: 'week' as const,
      startDate: '2026-06-08',
      endDate: '2026-06-14',
      completionRate: 100,
      doneDays: 7,
      totalDays: 7,
      streakDays: 7,
      longestStreak: 7,
      incompleteReasons: [],
      incompleteItems: [],
      habitProgress: [],
      planProgress: [],
      metrics: {},
      comparison: {
        completionRateDiff: 0,
        streakDiff: 0,
      },
      generatedAt: Date.now(),
      lastAutoUpdateAt: '2026-06-14',
    };

    const prompt = buildReviewPrompt(reviewData);

    expect(prompt).toContain('周复盘');
    expect(prompt).toContain('100%');
    expect(prompt).not.toContain('体重');
    expect(prompt).not.toContain('饮水');
  });
});

describe('parseReviewAIResponse', () => {
  it('should parse valid AI response', () => {
    const aiResponse = `SUMMARY:
本周整体表现良好，完成率达到80%，较上周提升10%。早睡习惯养成效果显著，连续3天完成目标。

HIGHLIGHTS:
- 早睡习惯连续3天，形成良好规律
- 运动时长增加30%，体能提升明显
- 饮水量达标，保持良好习惯

IMPROVEMENTS:
- 冥想完成率较低，建议设定固定时间
- 周三未完成，可提前规划时间安排`;

    const result = parseReviewAIResponse(aiResponse);

    expect(result.summary).toContain('本周整体表现良好');
    expect(result.highlights).toHaveLength(3);
    expect(result.highlights[0]).toContain('早睡习惯连续3天');
    expect(result.improvements).toHaveLength(2);
    expect(result.improvements[0]).toContain('冥想完成率较低');
  });

  it('should handle malformed AI response', () => {
    const aiResponse = 'This is a malformed response without proper structure';

    const result = parseReviewAIResponse(aiResponse);

    expect(result.summary).toBe('本周整体表现良好，继续保持。');
    expect(result.highlights).toEqual(['坚持打卡']);
    expect(result.improvements).toEqual(['继续保持']);
  });

  it('should handle empty AI response', () => {
    const aiResponse = '';

    const result = parseReviewAIResponse(aiResponse);

    expect(result.summary).toBe('本周整体表现良好，继续保持。');
    expect(result.highlights).toEqual(['坚持打卡']);
    expect(result.improvements).toEqual(['继续保持']);
  });

  it('should parse response with only SUMMARY', () => {
    const aiResponse = `SUMMARY:
本周表现不错，继续保持。

Some extra text here`;

    const result = parseReviewAIResponse(aiResponse);

    expect(result.summary).toContain('本周表现不错');
    expect(result.highlights).toEqual(['坚持打卡']); // fallback
    expect(result.improvements).toEqual(['继续保持']); // fallback
  });
});
