import { createDailyTodoHook } from '@egoless-do/core';
import { useMemo, useState, useCallback } from 'react';

import { useAppStore } from '../../store/useAppStore';

export const useDailyTodo = createDailyTodoHook(
  { useMemo, useState, useCallback },
  useAppStore as unknown as () => import('@egoless-do/core').DailyTodoStoreSlice,
);
