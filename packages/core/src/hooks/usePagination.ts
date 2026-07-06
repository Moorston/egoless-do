// ─── usePagination hook ──────────────────────────────────────────
// Provides offset-based pagination for FlatList with onEndReached.

import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationOptions<T> {
  /** Full dataset to paginate */
  data: T[];
  /** Number of items per page (default: 20) */
  pageSize?: number;
}

export interface UsePaginationResult<T> {
  /** Paginated items for the current page */
  items: T[];
  /** Whether more items are available */
  hasMore: boolean;
  /** Load the next page — call from FlatList's onEndReached */
  loadMore: () => void;
  /** Whether currently loading (for loading indicator) */
  isLoading: boolean;
  /** Reset pagination to first page */
  reset: () => void;
  /** Total number of items in the full dataset */
  total: number;
}

/**
 * Offset-based pagination hook for FlatList.
 *
 * @example
 * const { items, hasMore, loadMore } = usePagination({
 *   data: allReflections,
 *   pageSize: 20,
 * });
 *
 * <FlatList
 *   data={items}
 *   onEndReached={hasMore ? loadMore : undefined}
 *   onEndReachedThreshold={0.5}
 * />
 */
export function usePagination<T>({
  data,
  pageSize = 20,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);

  const items = useMemo(() => {
    return data.slice(0, page * pageSize);
  }, [data, page, pageSize]);

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    // Use setTimeout to allow FlatList to finish rendering before loading more
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 0);
  }, [hasMore, isLoading]);

  const reset = useCallback(() => {
    setPage(1);
    setIsLoading(false);
  }, []);

  return { items, hasMore, loadMore, isLoading, reset, total };
}
