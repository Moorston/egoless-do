import { describe, it, expect } from 'vitest';
import { mergeById } from './merge';

describe('mergeById', () => {
  it('returns local when server is empty', () => {
    const local = [{ id: '1', name: 'a', updatedAt: 100 }];
    expect(mergeById([], local, 'id')).toEqual(local);
  });
  it('returns server when local is empty', () => {
    const server = [{ id: '1', name: 'a', updatedAt: 100 }];
    expect(mergeById(server, [], 'id')).toEqual(server);
  });
  it('keeps server version when newer', () => {
    const server = [{ id: '1', name: 'server', updatedAt: 200 }];
    const local = [{ id: '1', name: 'local', updatedAt: 100 }];
    const result = mergeById(server, local, 'id');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('server');
  });
  it('keeps local version when newer', () => {
    const server = [{ id: '1', name: 'server', updatedAt: 100 }];
    const local = [{ id: '1', name: 'local', updatedAt: 200 }];
    const result = mergeById(server, local, 'id');
    expect(result[0].name).toBe('local');
  });
  it('merges disjoint sets', () => {
    const server = [{ id: '1', name: 's1', updatedAt: 100 }];
    const local = [{ id: '2', name: 'l2', updatedAt: 200 }];
    const result = mergeById(server, local, 'id');
    expect(result).toHaveLength(2);
  });
  it('handles missing updatedAt (treats as 0)', () => {
    const server = [{ id: '1', name: 'server' }];
    const local = [{ id: '1', name: 'local', updatedAt: 100 }];
    const result = mergeById(server, local, 'id');
    expect(result[0].name).toBe('local');
  });
});
