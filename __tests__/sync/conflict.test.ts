// ─── Conflict resolution tests ────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { resolveConflict } from '../../packages/core/src/sync/conflict';
import { mergeById } from '../../packages/core/src/sync/merge';

describe('resolveConflict', () => {
  describe('non-deleted records', () => {
    it('client wins when client timestamp is newer', () => {
      const result = resolveConflict({ clientUpdated: 100, serverUpdated: 90 });
      expect(result.winner).toBe('client');
    });

    it('server wins when server timestamp is newer', () => {
      const result = resolveConflict({ clientUpdated: 90, serverUpdated: 100 });
      expect(result.winner).toBe('server');
    });

    it('server wins on equal timestamps (single authority)', () => {
      const result = resolveConflict({ clientUpdated: 100, serverUpdated: 100 });
      expect(result.winner).toBe('server');
    });
  });

  describe('deleted records', () => {
    it('client delete wins when client timestamp is newer', () => {
      const result = resolveConflict({ clientUpdated: 100, serverUpdated: 90, clientDeleted: true });
      expect(result.winner).toBe('client');
    });

    it('server delete wins when server timestamp is newer', () => {
      const result = resolveConflict({ clientUpdated: 90, serverUpdated: 100, serverDeleted: true });
      expect(result.winner).toBe('server');
    });

    it('delete wins on equal timestamps (safety first)', () => {
      const result = resolveConflict({ clientUpdated: 100, serverUpdated: 100, clientDeleted: true });
      expect(result.winner).toBe('client');
    });

    it('server delete wins on equal timestamps', () => {
      const result = resolveConflict({ clientUpdated: 100, serverUpdated: 100, serverDeleted: true });
      expect(result.winner).toBe('server');
    });
  });
});

describe('mergeById', () => {
  it('uses resolveConflict for timestamp comparison', () => {
    const local = [{ id: '1', name: 'local', updatedAt: 100, deleted: false }];
    const server = [{ id: '1', name: 'server', updatedAt: 200, deleted: false }];
    const result = mergeById(server, local, 'id');
    expect(result[0].name).toBe('server');
  });

  it('preserves local deletion when local is newer', () => {
    const local = [{ id: '1', name: 'local', updatedAt: 200, deleted: true }];
    const server = [{ id: '1', name: 'server', updatedAt: 100, deleted: false }];
    const result = mergeById(server, local, 'id');
    expect(result[0].deleted).toBe(true);
  });

  it('server delete wins when server is newer', () => {
    const local = [{ id: '1', name: 'local', updatedAt: 100, deleted: false }];
    const server = [{ id: '1', name: 'server', updatedAt: 200, deleted: true }];
    const result = mergeById(server, local, 'id');
    // Server's deleted record replaces local (store layer filters deleted items)
    expect(result.find(i => i.id === '1')?.deleted).toBe(true);
  });
});
