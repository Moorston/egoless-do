import { THEMES } from '../core';
import { useStore } from './store';

export function getPrimaryColor(): string {
  return THEMES[useStore.getState().theme]?.primary ?? '#7C3AED';
}
