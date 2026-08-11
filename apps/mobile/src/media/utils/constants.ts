// ─── 音乐模块共享常量 ───────────────────────────────────────────

import { Repeat, Repeat1, Shuffle } from 'lucide-react-native';

import type { PlayMode } from '../useMusicStore';

/** 睡眠定时器分钟预设 */
export const SLEEP_PRESETS = [15, 30, 45, 60, 90];

/** 播放模式定义（图标 + key） */
export const PLAY_MODES: { mode: PlayMode; icon: typeof Repeat; labelKey: string }[] = [
  { mode: 'sequential', icon: Repeat, labelKey: 'musicPlayModeSequential' },
  { mode: 'repeat-all', icon: Repeat, labelKey: 'musicPlayModeRepeatAll' },
  { mode: 'repeat-one', icon: Repeat1, labelKey: 'musicPlayModeRepeatOne' },
  { mode: 'shuffle', icon: Shuffle, labelKey: 'musicPlayModeShuffle' },
];