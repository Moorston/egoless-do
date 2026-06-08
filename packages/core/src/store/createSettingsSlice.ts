import type { ThemeName } from '../types';
import type { SettingsSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createSettingsSlice(onPersist?: () => void): SliceCreator<SettingsSlice> {
  return (set) => ({
    theme: 'light' as ThemeName,
    language: 'zh',
    remindEnabled: false,
    remindTime: '21:00',

    setTheme(theme: ThemeName) { set({ theme }); onPersist?.(); },
    setLanguage(language: string) { set({ language }); onPersist?.(); },
    setRemindEnabled(v: boolean) { set({ remindEnabled: v }); onPersist?.(); },
    setRemindTime(t: string) { set({ remindTime: t }); onPersist?.(); },
  });
}
