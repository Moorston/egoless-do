// ─── usePagination unit tests ────────────────────────────────────
// Tests the pagination logic without React hooks (pure function approach).
import { describe, it, expect } from 'vitest';

// Extract the core pagination logic for testing
function paginate<T>(data: T[], page: number, pageSize: number) {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const items = data.slice(0, page * pageSize);
  const hasMore = page < totalPages;
  return { items, hasMore, total, totalPages };
}

describe('usePagination logic', () => {
  const data = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `item-${i}` }));

  it('returns first page of items', () => {
    const result = paginate(data, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(5);
  });

  it('returns second page correctly', () => {
    const result = paginate(data, 2, 10);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it('returns all items on last page', () => {
    const result = paginate(data, 5, 10);
    expect(result.items).toHaveLength(50);
    expect(result.hasMore).toBe(false);
  });

  it('handles data smaller than pageSize', () => {
    const smallData = [{ id: '1' }, { id: '2' }];
    const result = paginate(smallData, 1, 10);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.totalPages).toBe(1);
  });

  it('handles empty data', () => {
    const result = paginate([], 1, 10);
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('handles page beyond total pages', () => {
    const result = paginate(data, 10, 10);
    expect(result.items).toHaveLength(50);
    expect(result.hasMore).toBe(false);
  });

  it('works with different page sizes', () => {
    const r1 = paginate(data, 1, 5);
    expect(r1.items).toHaveLength(5);
    expect(r1.hasMore).toBe(true);
    expect(r1.totalPages).toBe(10);

    const r2 = paginate(data, 1, 25);
    expect(r2.items).toHaveLength(25);
    expect(r2.hasMore).toBe(true);
    expect(r2.totalPages).toBe(2);

    const r3 = paginate(data, 1, 100);
    expect(r3.items).toHaveLength(50);
    expect(r3.hasMore).toBe(false);
    expect(r3.totalPages).toBe(1);
  });
});
