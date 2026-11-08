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


  describe('soft-deletion preservation', () => {
    it('does NOT resurrect a locally deleted record when server has a newer non-deleted version', () => {
      const server = [{ id: '1', name: 'server', updatedAt: 200, deleted: false }];
      const local = [{ id: '1', name: 'local', updatedAt: 100, deleted: true }];
      const result = mergeById(server, local, 'id');
      // Local delete wins: the server's non-deleted version must NOT appear (no resurrection).
      // Deleted records are excluded from the merged output, so the id should be absent.
      expect(result.find(r => r.id === '1')).toBeUndefined();
    });

    it('keeps the local tombstone even when server delete flag is absent (undefined)', () => {
      const server = [{ id: '1', name: 'server', updatedAt: 999 }];
      const local = [{ id: '1', name: 'local', updatedAt: 1, deleted: 1 }];
      const result = mergeById(server, local, 'id');
      // Without the fix, the newer server record (no delete flag) would overwrite and resurrect the tombstone.
      expect(result.find(r => r.id === '1')).toBeUndefined();
    });

    it('still propagates a server delete onto a live local record', () => {
      const server = [{ id: '1', name: 'server', updatedAt: 200, deleted: true }];
      const local = [{ id: '1', name: 'local', updatedAt: 100, deleted: false }];
      const result = mergeById(server, local, 'id');
      expect(result).toHaveLength(0);
    });

    it('does not change normal newer-server-wins behaviour for live records', () => {
      const server = [{ id: '1', name: 'server', updatedAt: 200, deleted: false }];
      const local = [{ id: '1', name: 'local', updatedAt: 100, deleted: false }];
      const result = mergeById(server, local, 'id');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('server');
      expect(result[0].deleted).toBe(false);
    });
  });
});
