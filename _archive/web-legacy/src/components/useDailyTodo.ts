import { useMemo, useState, useCallback } from 'react';
import { useWebStore } from '../store/useWebStore';
import { createDailyTodoHook } from '@egoless-do/core';

export const useDailyTodo = createDailyTodoHook(
  { useMemo, useState, useCallback },
  useWebStore as unknown as () => import('@egoless-do/core').DailyTodoStoreSlice,
);
