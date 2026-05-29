import { describe, it, expect } from 'vitest';
import type { Habit } from '../types';
import {
  addHabitToList, updateHabitInList, deleteHabitFromList,
  checkinHabitInList, changeHabitStatusInList,
} from './habits';
import { dateStr, yesterday } from '../utils';

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Test', startDate: '2026-01-01', targetDays: 30,
  goal: '', insight: '', createTag: false, doneDays: 0, streak: 0,
  interrupted: 0, status: 'inProgress', checkedDates: [],
  pauseReason: '', abandonReason: '', ...overrides,
});

describe('addHabitToList', () => {
  it('appends a new habit', () => {
    const result = addHabitToList([], {
      name: 'Meditate', startDate: '2026-01-01', targetDays: 7,
      goal: 'calm', insight: '', createTag: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Meditate');
    expect(result[0].status).toBe('notStarted');
  });
  it('preserves existing habits', () => {
    const existing = makeHabit({ id: 'existing' });
    const result = addHabitToList([existing], {
      name: 'New', startDate: '2026-01-01', targetDays: 7,
      goal: '', insight: '', createTag: false,
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('existing');
  });
});

describe('updateHabitInList', () => {
  it('patches matching habit', () => {
    const habits = [makeHabit()];
    const result = updateHabitInList(habits, 'h1', { name: 'Updated' });
    expect(result[0].name).toBe('Updated');
    expect(result[0].updatedAt).toBeDefined();
  });
  it('does not modify non-matching habits', () => {
    const habits = [makeHabit()];
    const result = updateHabitInList(habits, 'other', { name: 'X' });
    expect(result[0].name).toBe('Test');
  });
});

describe('deleteHabitFromList', () => {
  it('removes matching habit', () => {
    const habits = [makeHabit({ id: 'a' }), makeHabit({ id: 'b' })];
    const result = deleteHabitFromList(habits, 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});

describe('checkinHabitInList', () => {
  it('adds date to checkedDates', () => {
    const habits = [makeHabit()];
    const result = checkinHabitInList(habits, 'h1', '2026-01-15');
    expect(result[0].checkedDates).toContain('2026-01-15');
    expect(result[0].doneDays).toBe(1);
  });
  it('toggles date off if already checked', () => {
    const habits = [makeHabit({ checkedDates: ['2026-01-15'] })];
    const result = checkinHabitInList(habits, 'h1', '2026-01-15');
    expect(result[0].checkedDates).not.toContain('2026-01-15');
    expect(result[0].doneDays).toBe(0);
  });
});

describe('changeHabitStatusInList', () => {
  it('changes status', () => {
    const habits = [makeHabit()];
    const result = changeHabitStatusInList(habits, 'h1', 'paused', 'tired');
    expect(result[0].status).toBe('paused');
    expect(result[0].pauseReason).toBe('tired');
  });
  it('sets abandonReason for abandoned status', () => {
    const habits = [makeHabit()];
    const result = changeHabitStatusInList(habits, 'h1', 'abandoned', 'bored');
    expect(result[0].abandonReason).toBe('bored');
  });
});
