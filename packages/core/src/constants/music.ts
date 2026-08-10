import type { MusicTrack, MusicCategory } from '../types/music';

// 内置音乐列表，file 使用 require() 在 mobile 端加载
// 注意：file 字段需要在 mobile 端通过 require() 填充，这里定义为 0 占位
export const BUILTIN_TRACKS: MusicTrack[] = [
  // ── 专注类 (focus) ──────────────────────────────────────────
  { id: 'ocean',          name: '海潮',     nameEn: 'Ocean Waves',    category: 'focus',     file: 0 },
  { id: 'rain',           name: '雨声',     nameEn: 'Rain',           category: 'focus',     file: 0 },
  { id: 'flowing-stream', name: '溪流',     nameEn: 'Flowing Stream', category: 'focus',     file: 0 },
  { id: 'white-noise',    name: '白噪音',   nameEn: 'White Noise',    category: 'focus',     file: 0 },
  { id: 'cafe',           name: '咖啡馆',   nameEn: 'Cafe Ambience',  category: 'focus',     file: 0 },
  { id: 'keyboard',       name: '键盘声',   nameEn: 'Keyboard',       category: 'focus',     file: 0 },

  // ── 冥想类 (meditate) ───────────────────────────────────────
  { id: 'bowl',           name: '钵声',     nameEn: 'Singing Bowl',   category: 'meditate',  file: 0 },
  { id: 'wind-chimes',    name: '风铃',     nameEn: 'Wind Chimes',    category: 'meditate',  file: 0 },
  { id: 'birds',          name: '鸟叫',     nameEn: 'Birds',          category: 'meditate',  file: 0 },
  { id: 'temple-bell',    name: '钟声',     nameEn: 'Temple Bell',    category: 'meditate',  file: 0 },
  { id: 'singing-bowl',   name: '颂钵',     nameEn: 'Singing Bowl 2', category: 'meditate',  file: 0 },
  { id: 'tibetan-bell',   name: '西藏铃',   nameEn: 'Tibetan Bell',   category: 'meditate',  file: 0 },
  { id: 'water-flow',     name: '流水',     nameEn: 'Water Flow',     category: 'meditate',  file: 0 },

  // ── 运动类 (exercise) ──────────────────────────────────────
  { id: 'beat',           name: '节拍',     nameEn: 'Beat',           category: 'exercise',  file: 0 },
  { id: 'drums',          name: '鼓点',     nameEn: 'Drums',          category: 'exercise',  file: 0 },
  { id: 'electronic',     name: '电子',     nameEn: 'Electronic',     category: 'exercise',  file: 0 },

  // ── 睡眠类 (sleep) ─────────────────────────────────────────
  { id: 'lullaby',        name: '摇篮曲',   nameEn: 'Lullaby',        category: 'sleep',     file: 0 },
  { id: 'asmr',           name: 'ASMR',     nameEn: 'ASMR',           category: 'sleep',     file: 0 },
  { id: 'fireplace',      name: '壁炉',     nameEn: 'Fireplace',      category: 'sleep',     file: 0 },

  // ── 自然类 (nature) ────────────────────────────────────────
  { id: 'forest',         name: '森林',     nameEn: 'Forest',         category: 'nature',    file: 0 },
  { id: 'thunderstorm',   name: '雷雨',     nameEn: 'Thunderstorm',   category: 'nature',    file: 0 },
  { id: 'seagulls',       name: '海鸥',     nameEn: 'Seagulls',       category: 'nature',    file: 0 },
];

export const MUSIC_CATEGORIES: { key: MusicCategory; nameKey: string }[] = [
  { key: 'all',      nameKey: 'musicAll' },
  { key: 'focus',    nameKey: 'musicFocus' },
  { key: 'meditate', nameKey: 'musicMeditate' },
  { key: 'exercise', nameKey: 'musicExercise' },
  { key: 'sleep',    nameKey: 'musicSleep' },
  { key: 'nature',   nameKey: 'musicNature' },
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
  { key: 'sleep',    nameKey: 'musicSleep',     icon: 'Moon',     gradient: ['#3b82f6', '#2563eb'] },
  { key: 'nature',   nameKey: 'musicNature',    icon: 'TreePine', gradient: ['#22c55e', '#16a34a'] },
  { key: 'my',       nameKey: 'musicMy',        icon: 'Music',    gradient: ['#8b5cf6', '#6d28d9'] },
  { key: 'favorites',nameKey: 'musicFavorites',  icon: 'Heart',    gradient: ['#ec4899', '#be185d'] },
];

// 内置曲目图标和颜色映射
export const TRACK_VISUAL: Record<string, { icon: string; gradient: readonly [string, string] }> = {
  // ── 专注类 ──────────────────────────────────────────────────
  'ocean':          { icon: 'Waves',      gradient: ['#0ea5e9', '#0369a1'] },
  'rain':           { icon: 'CloudRain',  gradient: ['#6366f1', '#4338ca'] },
  'flowing-stream': { icon: 'Droplets',   gradient: ['#14b8a6', '#0d9488'] },
  'white-noise':    { icon: 'Radio',      gradient: ['#64748b', '#475569'] },
  'cafe':           { icon: 'Coffee',     gradient: ['#78350f', '#451a03'] },
  'keyboard':       { icon: 'Keyboard',   gradient: ['#6b7280', '#4b5563'] },

  // ── 冥想类 ──────────────────────────────────────────────────
  'bowl':           { icon: 'Bell',       gradient: ['#f59e0b', '#d97706'] },
  'wind-chimes':    { icon: 'Wind',       gradient: ['#a78bfa', '#7c3aed'] },
  'birds':          { icon: 'Bird',       gradient: ['#10b981', '#059669'] },
  'temple-bell':    { icon: 'Bell',       gradient: ['#f59e0b', '#d97706'] },
  'singing-bowl':   { icon: 'Bell',       gradient: ['#fbbf24', '#d97706'] },
  'tibetan-bell':   { icon: 'Bell',       gradient: ['#c084fc', '#9333ea'] },
  'water-flow':     { icon: 'Droplets',   gradient: ['#22d3ee', '#0891b2'] },

  // ── 运动类 ──────────────────────────────────────────────────
  'beat':           { icon: 'Music',      gradient: ['#ef4444', '#dc2626'] },
  'drums':          { icon: 'Music',      gradient: ['#f97316', '#ea580c'] },
  'electronic':     { icon: 'Zap',        gradient: ['#8b5cf6', '#7c3aed'] },

  // ── 睡眠类 ──────────────────────────────────────────────────
  'lullaby':        { icon: 'Moon',       gradient: ['#3b82f6', '#2563eb'] },
  'asmr':           { icon: 'Headphones', gradient: ['#ec4899', '#db2777'] },
  'fireplace':      { icon: 'Flame',      gradient: ['#f97316', '#ea580c'] },

  // ── 自然类 ──────────────────────────────────────────────────
  'forest':         { icon: 'TreePine',   gradient: ['#22c55e', '#16a34a'] },
  'thunderstorm':   { icon: 'CloudLightning', gradient: ['#6366f1', '#4f46e5'] },
  'seagulls':       { icon: 'Bird',       gradient: ['#0ea5e9', '#0284c7'] },
};
