import { describe, it, expect } from 'vitest';
import type { MindReflection } from '../types';
import {
  addReflectionToList, togglePinInList,
  deleteReflectionFromList, updateReflectionInList,
} from './reflections';

const makeReflection = (overrides: Partial<MindReflection> = {}): MindReflection => ({
  id: 'r1', timestamp: 1000, content: 'hello', tags: ['t1'], mood: 'calm',
  colors: ['#fff', '#000'] as unknown as readonly [string, string],
  isPinned: false, isPublished: false, updatedAt: 0, deleted: false, ...overrides,
});

describe('addReflectionToList', () => {
  it('prepends a new reflection to the list', () => {
    const existing = makeReflection({ id: 'old' });
    const result = addReflectionToList([existing], {
      content: 'new thought', tags: ['work'], mood: 'happy',
    });
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('new thought');
    expect(result[0].tags).toEqual(['work']);
    expect(result[1].id).toBe('old');
  });
  it('works with empty list', () => {
    const result = addReflectionToList([], {
      content: 'first', tags: [], mood: 'neutral',
    });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('first');
  });
  it('assigns unique id and timestamp', () => {
    const r1 = addReflectionToList([], { content: 'a', tags: [], mood: '' });
    const r2 = addReflectionToList([], { content: 'b', tags: [], mood: '' });
    expect(r1[0].id).not.toBe(r2[0].id);
  });
});

describe('togglePinInList', () => {
  it('toggles isPinned from false to true', () => {
    const list = [makeReflection({ isPinned: false })];
    const result = togglePinInList(list, 'r1');
    expect(result[0].isPinned).toBe(true);
  });
  it('toggles isPinned from true to false', () => {
    const list = [makeReflection({ isPinned: true })];
    const result = togglePinInList(list, 'r1');
    expect(result[0].isPinned).toBe(false);
  });
  it('does not affect other reflections', () => {
    const list = [
      makeReflection({ id: 'a', isPinned: false }),
      makeReflection({ id: 'b', isPinned: true }),
    ];
    const result = togglePinInList(list, 'a');
    expect(result[0].isPinned).toBe(true);
    expect(result[1].isPinned).toBe(true);
  });
  it('updates updatedAt on toggle', () => {
    const list = [makeReflection({ updatedAt: 0 })];
    const result = togglePinInList(list, 'r1');
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });
});

describe('deleteReflectionFromList', () => {
  it('marks matching reflection as deleted', () => {
    const list = [makeReflection({ id: 'a' }), makeReflection({ id: 'b' })];
    const result = deleteReflectionFromList(list, 'a');
    expect(result[0].deleted).toBe(true);
    expect(result[1].deleted).toBe(false);
  });
  it('does not modify non-matching reflections', () => {
    const list = [makeReflection()];
    const result = deleteReflectionFromList(list, 'other');
    expect(result[0].deleted).toBe(false);
  });
  it('updates updatedAt on delete', () => {
    const list = [makeReflection({ updatedAt: 0 })];
    const result = deleteReflectionFromList(list, 'r1');
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });
});

describe('updateReflectionInList', () => {
  it('patches content and tags', () => {
    const list = [makeReflection()];
    const result = updateReflectionInList(list, 'r1', { content: 'updated', tags: ['new'] });
    expect(result[0].content).toBe('updated');
    expect(result[0].tags).toEqual(['new']);
  });
  it('patches mood and link', () => {
    const list = [makeReflection()];
    const result = updateReflectionInList(list, 'r1', { mood: 'excited', link: 'https://example.com' });
    expect(result[0].mood).toBe('excited');
    expect(result[0].link).toBe('https://example.com');
  });
  it('does not modify non-matching reflections', () => {
    const list = [makeReflection()];
    const result = updateReflectionInList(list, 'other', { content: 'nope' });
    expect(result[0].content).toBe('hello');
  });
  it('updates updatedAt on patch', () => {
    const list = [makeReflection({ updatedAt: 0 })];
    const result = updateReflectionInList(list, 'r1', { content: 'x' });
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });
});
