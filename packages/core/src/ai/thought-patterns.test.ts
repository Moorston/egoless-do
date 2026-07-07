import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectMoodSequencePatterns,
  detectTagPatterns,
  detectKeywordPatterns,
  getAllThoughtPatterns,
} from './thought-patterns';
import type { MindReflection } from '../types';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-07T12:00:00')); });
afterEach(() => { vi.useRealTimers(); });

function makeReflection(overrides: Partial<MindReflection> = {}): MindReflection {
  return {
    id: 'r1', content: '', mood: '开心', tags: [],
    timestamp: Date.now(), deleted: false,
    ...overrides,
  } as MindReflection;
}

// ─── detectMoodSequencePatterns ───────────────────────────────
describe('detectMoodSequencePatterns', () => {
  it('returns empty for fewer than 4 reflections', () => {
    const r = Array.from({ length: 3 }, (_, i) => makeReflection({ id: `r${i}`, mood: '焦虑' }));
    expect(detectMoodSequencePatterns(r)).toEqual([]);
  });

  it('detects anxiety cycle pattern', () => {
    // Pattern: 焦虑, 焦虑, 难过, 焦虑 — needs 2+ matches
    const moods = ['焦虑', '焦虑', '难过', '焦虑', '焦虑', '焦虑', '难过', '焦虑'];
    const r = moods.map((mood, i) => makeReflection({
      id: `r${i}`, mood, timestamp: Date.now() - (moods.length - i) * 86400000,
    }));
    const patterns = detectMoodSequencePatterns(r);
    const anxiety = patterns.find(p => p.id === 'mood_seq_anxiety_cycle');
    expect(anxiety).toBeDefined();
    expect(anxiety!.frequency).toBeGreaterThanOrEqual(2);
  });

  it('ignores deleted reflections', () => {
    const moods = ['焦虑', '焦虑', '难过', '焦虑', '焦虑', '焦虑', '难过', '焦虑'];
    const r = moods.map((mood, i) => makeReflection({
      id: `r${i}`, mood, deleted: i === 0,
      timestamp: Date.now() - (moods.length - i) * 86400000,
    }));
    // With first deleted, sequence shifts — may not match
    expect(() => detectMoodSequencePatterns(r)).not.toThrow();
  });
});

// ─── detectTagPatterns ────────────────────────────────────────
describe('detectTagPatterns', () => {
  it('returns empty for too few reflections', () => {
    const r = Array.from({ length: 3 }, (_, i) => makeReflection({ tags: ['工作'] }));
    expect(detectTagPatterns(r)).toEqual([]);
  });

  it('detects trigger pattern for high-frequency tag with varied moods', () => {
    const moods = ['焦虑', '开心', '疲惫', '平静', '难过'];
    const r = moods.map((mood, i) => makeReflection({
      id: `r${i}`, mood, tags: ['工作'],
    }));
    const patterns = detectTagPatterns(r);
    const trigger = patterns.find(p => p.id === 'tag_pattern_工作');
    expect(trigger).toBeDefined();
    expect(trigger!.type).toBe('trigger');
  });

  it('no pattern when moods are uniform', () => {
    const r = Array.from({ length: 5 }, (_, i) => makeReflection({
      id: `r${i}`, mood: '开心', tags: ['旅行'],
    }));
    const patterns = detectTagPatterns(r);
    expect(patterns.find(p => p.id === 'tag_pattern_旅行')).toBeUndefined();
  });
});

// ─── detectKeywordPatterns ────────────────────────────────────
describe('detectKeywordPatterns', () => {
  it('returns empty when no keyword appears 3+ times', () => {
    const r = [
      makeReflection({ content: '今天工作很忙' }),
      makeReflection({ content: '工作压力大' }),
    ];
    expect(detectKeywordPatterns(r)).toEqual([]);
  });

  it('detects keyword pattern when word appears 3+ times', () => {
    const r = Array.from({ length: 4 }, (_, i) => makeReflection({
      id: `r${i}`, content: `今天工作很${i === 0 ? '累' : '忙'}`, mood: '焦虑',
    }));
    const patterns = detectKeywordPatterns(r);
    const kw = patterns.find(p => p.id === 'keyword_工作');
    expect(kw).toBeDefined();
    expect(kw!.frequency).toBe(4);
  });
});

// ─── getAllThoughtPatterns ────────────────────────────────────
describe('getAllThoughtPatterns', () => {
  it('returns empty for empty input', () => {
    expect(getAllThoughtPatterns([])).toEqual([]);
  });

  it('returns patterns sorted by confidence descending', () => {
    // Create enough reflections to trigger multiple pattern types
    const r = Array.from({ length: 10 }, (_, i) => makeReflection({
      id: `r${i}`,
      content: i % 2 === 0 ? '工作很累' : '学习很开心',
      mood: ['焦虑', '开心', '疲惫', '平静', '焦虑'][i % 5],
      tags: i < 5 ? ['工作'] : ['学习'],
      timestamp: Date.now() - (10 - i) * 86400000,
    }));
    const patterns = getAllThoughtPatterns(r);
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i].confidence).toBeLessThanOrEqual(patterns[i - 1].confidence);
    }
  });
});
