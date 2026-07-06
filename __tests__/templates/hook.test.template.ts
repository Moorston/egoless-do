/**
 * Hook 测试模板
 * 使用方法: 复制此文件，替换 useXxx 和相关类型
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { renderHook, act } from '@testing-library/react-hooks';
// import { useXxx } from './useXxx';

// ── Mock 设置 ──────────────────────────────────────────────────────

// vi.mock('../../store/useAppStore', () => ({
//   useAppStore: vi.fn(),
//   useShallowStore: vi.fn(),
// }));

// ── 测试套件 ──────────────────────────────────────────────────────

describe('useXxx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // it('returns initial state', () => {
  //   vi.mocked(useShallowStore).mockReturnValue({ items: [] });
  //   const { result } = renderHook(() => useXxx());
  //   expect(result.current.items).toEqual([]);
  // });

  // it('handles user action', async () => {
  //   const mockAction = vi.fn();
  //   vi.mocked(useShallowStore).mockReturnValue({ items: [], doAction: mockAction });
  //   const { result } = renderHook(() => useXxx());
  //
  //   await act(async () => {
  //     await result.current.doAction();
  //   });
  //
  //   expect(mockAction).toHaveBeenCalled();
  // });
});
