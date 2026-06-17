import type { AudioPlayer } from 'expo-audio';

/**
 * 全局音频播放器引用，由 AudioEngineProvider 设置，供 PlayerBar 等组件共享使用。
 * 使用模块级 ref 避免 Zustand store 中 null player 导致 useAudioPlayerStatus 崩溃。
 */
export const audioPlayerRef: { current: AudioPlayer | null } = { current: null };
