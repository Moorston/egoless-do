import { describe, it, expect } from 'vitest';
import { resolveConflict } from './conflict';

describe('resolveConflict', () => {
  it('client wins when newer', () => {
    expect(resolveConflict({ clientUpdated: 2000, serverUpdated: 1000 }).winner).toBe('client');
  });
  it('server wins when newer', () => {
    expect(resolveConflict({ clientUpdated: 1000, serverUpdated: 2000 }).winner).toBe('server');
  });
  it('server wins on tie', () => {
    expect(resolveConflict({ clientUpdated: 1000, serverUpdated: 1000 }).winner).toBe('server');
  });
  it('server wins when both deleted and equal timestamps', () => {
    expect(resolveConflict({ clientUpdated: 1000, serverUpdated: 1000, clientDeleted: true, serverDeleted: true }).winner).toBe('server');
  });
  it('delete side wins when only one deleted with later timestamp', () => {
    expect(resolveConflict({ clientUpdated: 2000, serverUpdated: 1000, clientDeleted: true }).winner).toBe('client');
  });
  it('server deleted wins when newer', () => {
    expect(resolveConflict({ clientUpdated: 1000, serverUpdated: 2000, serverDeleted: true }).winner).toBe('server');
  });
});
