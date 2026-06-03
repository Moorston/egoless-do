import type { ThemeName } from '../types';
import type { SettingsSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createSettingsSlice(): SliceCreator<SettingsSlice> {
  return (set) => ({
    theme: 'light' as ThemeName,
    language: 'zh',
    remindEnabled: false,
    remindTime: '21:00',

    setTheme(theme: ThemeName) { set({ theme }); },
    setLanguage(language: string) { set({ language }); },
    setRemindEnabled(v: boolean) { set({ remindEnabled: v }); },
    setRemindTime(t: string) { set({ remindTime: t }); },
  });
}
