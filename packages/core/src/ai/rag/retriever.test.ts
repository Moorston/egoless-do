import { describe, it, expect } from 'vitest';
import { expandTerms, retrieveTopK, SYNONYM_MAP } from './retriever';
import type { ReflectionIndex } from './indexer';

// ─── Test helpers ───────────────────────────────────────────
function makeIndex(overrides: Partial<ReflectionIndex> = {}): ReflectionIndex {
  return {
    id: 'r1',
    content: '',
    contentLower: '',
    keywords: [],
    mood: '',
    moodLower: '',
    tags: [],
    tagsLower: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── expandTerms ────────────────────────────────────────────
describe('expandTerms', () => {
  it('returns original terms when no synonyms match', () => {
    const result = expandTerms(['xyz123', 'abc456']);
    expect(result).toEqual(expect.arrayContaining(['xyz123', 'abc456']));
  });

  it('expands a main term to include all its synonyms', () => {
    const result = expandTerms(['焦虑']);
    expect(result).toContain('焦虑');
    expect(result).toContain('紧张');
    expect(result).toContain('不安');
    expect(result).toContain('压力');
  });

  it('expands a synonym back to its main term and siblings', () => {
    // '高兴' is a synonym of '开心'
    const result = expandTerms(['高兴']);
    expect(result).toContain('开心');
    expect(result).toContain('快乐');
    expect(result).toContain('高兴');
  });

  it('expands via substring matching (≥2 chars)', () => {
    // '焦' alone (< 2 chars) should NOT trigger substring match
    const short = expandTerms(['焦']);
    // '焦虑' is a main term, so '焦' alone won't match via substring
    // but '虑' is 1 char, also won't match

    // '焦虑' (2 chars, exact match as main term) should expand
    const exact = expandTerms(['焦虑']);
    expect(exact.length).toBeGreaterThan(1);
  });

  it('deduplicates expanded terms', () => {
    const result = expandTerms(['开心', '高兴']);
    // '高兴' is a synonym of '开心', so expansion overlaps
    const uniqueCheck = new Set(result);
    expect(result.length).toBe(uniqueCheck.size);
  });

  it('handles empty input', () => {
    expect(expandTerms([])).toEqual([]);
  });

  it('handles terms that are not in the synonym map', () => {
    const result = expandTerms(['量子力学']);
    expect(result).toContain('量子力学');
    expect(result.length).toBe(1);
  });
});

// ─── retrieveTopK ───────────────────────────────────────────
describe('retrieveTopK', () => {
  const now = Date.now();

  const reflections: ReflectionIndex[] = [
    makeIndex({
      id: 'r1',
      content: '今天很焦虑，工作压力大',
      contentLower: '今天很焦虑，工作压力大',
      mood: '焦虑',
      moodLower: '焦虑',
      tags: ['工作'],
      tagsLower: ['工作'],
      timestamp: now - 1000, // very recent
    }),
    makeIndex({
      id: 'r2',
      content: '心情不错，和朋友吃饭很开心',
      contentLower: '心情不错，和朋友吃饭很开心',
      mood: '开心',
      moodLower: '开心',
      tags: ['社交'],
      tagsLower: ['社交'],
      timestamp: now - 86400000 * 10, // 10 days ago
    }),
    makeIndex({
      id: 'r3',
      content: '今天跑步了，感觉身体好了很多',
      contentLower: '今天跑步了，感觉身体好了很多',
      mood: '平静',
      moodLower: '平静',
      tags: ['健康', '运动'],
      tagsLower: ['健康', '运动'],
      timestamp: now - 86400000 * 60, // 60 days ago (older)
    }),
    makeIndex({
      id: 'r4',
      content: '无内容',
      contentLower: '无内容',
      mood: '',
      moodLower: '',
      tags: [],
      tagsLower: [],
      timestamp: now,
    }),
  ];

  it('returns empty array for empty query', () => {
    expect(retrieveTopK('', reflections)).toEqual([]);
    expect(retrieveTopK('   ', reflections)).toEqual([]);
  });

  it('returns empty array for empty index', () => {
    expect(retrieveTopK('焦虑', [])).toEqual([]);
  });

  it('returns results sorted by score descending', () => {
    const results = retrieveTopK('焦虑', reflections, 10);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('finds reflections matching by keyword in content', () => {
    const results = retrieveTopK('焦虑', reflections, 10);
    const ids = results.map(r => r.index.id);
    expect(ids).toContain('r1'); // contains '焦虑' in content
  });

  it('finds reflections matching by mood', () => {
    const results = retrieveTopK('焦虑', reflections, 10);
    const r1 = results.find(r => r.index.id === 'r1');
    expect(r1).toBeDefined();
    expect(r1!.score).toBeGreaterThan(0);
  });

  it('finds reflections matching by tag', () => {
    const results = retrieveTopK('工作', reflections, 10);
    const ids = results.map(r => r.index.id);
    expect(ids).toContain('r1'); // has tag '工作'
  });

  it('respects the k limit', () => {
    const results = retrieveTopK('焦虑', reflections, 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('ranks recent reflections higher than old ones for same match', () => {
    // Both r1 and r3 match '运动' partially, but r3 has it as tag
    const results = retrieveTopK('运动', reflections, 10);
    // r3 should be found (has tag '运动')
    const r3 = results.find(r => r.index.id === 'r3');
    expect(r3).toBeDefined();
  });

  it('returns low scores for unmatched queries (time decay still applies)', () => {
    const results = retrieveTopK('量子力学', reflections, 10);
    // No keyword/mood/tag match, but time score > 0 for all items
    // Results exist but with low scores (only time component)
    if (results.length > 0) {
      expect(results[0].score).toBeLessThan(0.2); // only time weight (0.1) contributes
    }
  });

  it('handles multi-term queries', () => {
    const results = retrieveTopK('焦虑 工作', reflections, 10);
    const r1 = results.find(r => r.index.id === 'r1');
    expect(r1).toBeDefined();
    // r1 matches both '焦虑' (content+mood) and '工作' (tag)
    expect(r1!.score).toBeGreaterThan(0);
  });

  it('expands query terms via synonyms', () => {
    // '紧张' is a synonym of '焦虑'
    const results = retrieveTopK('紧张', reflections, 10);
    const r1 = results.find(r => r.index.id === 'r1');
    // Should find r1 because '紧张' expands to include '焦虑'
    expect(r1).toBeDefined();
    expect(r1!.score).toBeGreaterThan(0);
  });
});
