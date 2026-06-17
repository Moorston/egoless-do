import type { ThemeName } from '../types';
import type { SettingsSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createSettingsSlice(onPersist?: () => void, onSettingChange?: () => void): SliceCreator<SettingsSlice> {
  return (set: any, get: any) => ({
    theme: 'light' as ThemeName,
    language: 'zh',
    remindEnabled: false,
    remindTime: '21:00',

    setTheme(theme: ThemeName) { set({ theme }); onSettingChange?.(); onPersist?.(); },
    setLanguage(language: string) { set({ language }); onSettingChange?.(); onPersist?.(); },
    setRemindEnabled(v: boolean) { set({ remindEnabled: v }); onSettingChange?.(); onPersist?.(); },
    setRemindTime(t: string) { set({ remindTime: t }); onSettingChange?.(); onPersist?.(); },
  });
}
