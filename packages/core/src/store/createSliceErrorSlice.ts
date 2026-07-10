// ─── Slice-level error tracking slice ─────────────────────────
import type { SliceError, SliceErrorState } from './types';
import type { SliceCreator } from './sliceHelper';

const MAX_SLICE_ERRORS = 20;

export function createSliceErrorSlice(): SliceCreator<SliceErrorState> {
  return (set) => ({
    sliceErrors: [],

    addSliceError(error: SliceError) {
      set(s => ({
        sliceErrors: [...s.sliceErrors, error].slice(-MAX_SLICE_ERRORS),
      }));
    },

    clearSliceErrors() {
      set({ sliceErrors: [] });
    },
  });
}
