import type { MusicTrack, MusicCategory } from '../types/music';

// 内置音乐列表，file 使用 require() 在 mobile 端加载
// 注意：file 字段需要在 mobile 端通过 require() 填充，这里定义为 0 占位
export const BUILTIN_TRACKS: MusicTrack[] = [
  { id: 'ocean',          name: '海潮',   nameEn: 'Ocean Waves',    category: 'focus',     file: 0 },
  { id: 'rain',           name: '雨声',   nameEn: 'Rain',           category: 'focus',     file: 0 },
  { id: 'flowing-stream', name: '溪流',   nameEn: 'Flowing Stream', category: 'focus',     file: 0 },
  { id: 'bowl',           name: '钵声',   nameEn: 'Singing Bowl',   category: 'meditate',  file: 0 },
  { id: 'wind-chimes',    name: '风铃',   nameEn: 'Wind Chimes',    category: 'meditate',  file: 0 },
  { id: 'birds',          name: '鸟叫',   nameEn: 'Birds',          category: 'meditate',  file: 0 },
];

export const MUSIC_CATEGORIES: { key: MusicCategory; nameKey: string }[] = [
  { key: 'all',      nameKey: 'musicAll' },
  { key: 'focus',    nameKey: 'musicFocus' },
  { key: 'meditate', nameKey: 'musicMeditate' },
  { key: 'exercise', nameKey: 'musicExercise' },
  { key: 'my',       nameKey: 'musicMy' },
];

// 用户音乐 AsyncStorage key
export const USER_MUSIC_STORAGE_KEY = 'user_music_library';

// 收藏 AsyncStorage key
export const MUSIC_FAVORITES_KEY = 'music_favorites';

// 分类卡片元数据（图标名、渐变色）
export interface MusicCategoryMeta {
  key: string;
  nameKey: string;
  icon: string;
  gradient: readonly [string, string];
}

export const MUSIC_CATEGORY_META: MusicCategoryMeta[] = [
  { key: 'focus',    nameKey: 'musicFocus',     icon: 'Waves',    gradient: ['#0ea5e9', '#0369a1'] },
  { key: 'meditate', nameKey: 'musicMeditate',  icon: 'Bell',     gradient: ['#f59e0b', '#d97706'] },
  { key: 'exercise', nameKey: 'musicExercise',  icon: 'Dumbbell', gradient: ['#10b981', '#059669'] },
  { key: 'my',       nameKey: 'musicMy',        icon: 'Music',    gradient: ['#8b5cf6', '#6d28d9'] },
  { key: 'favorites',nameKey: 'musicFavorites',  icon: 'Heart',    gradient: ['#ec4899', '#be185d'] },
];

// 内置曲目图标和颜色映射
export const TRACK_VISUAL: Record<string, { icon: string; gradient: readonly [string, string] }> = {
  'ocean':          { icon: 'Waves',      gradient: ['#0ea5e9', '#0369a1'] },
  'rain':           { icon: 'CloudRain',  gradient: ['#6366f1', '#4338ca'] },
  'flowing-stream': { icon: 'Droplets',   gradient: ['#14b8a6', '#0d9488'] },
  'bowl':           { icon: 'Bell',       gradient: ['#f59e0b', '#d97706'] },
  'wind-chimes':    { icon: 'Wind',       gradient: ['#a78bfa', '#7c3aed'] },
  'birds':          { icon: 'Bird',       gradient: ['#10b981', '#059669'] },
};
