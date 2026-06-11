## Why

冥想页当前自管理 6 个固定背景音（SOUND_FILES + bgPlayer），与轻松听模块的音乐库功能重复。用户无法使用自定义音乐、收藏列表等轻松听已有的能力。将冥想页的音频播放接入轻松听全局 store，复用 MusicMiniBar 组件。

## What Changes

- 移除 MeditationScreen 中的 SOUND_FILES、bgPlayer、bgSource、playBgSound、stopBgSound
- 导入 useMusicStore + MusicMiniBar，用全局音乐 store 管理背景音乐
- 替换 TagPill 声音选择器为 MusicMiniBar + "选择音乐"入口
- 保留 bellPlayer（完成钵声）不变
- 打坐中 MusicMiniBar 始终显示，支持切歌/暂停/循环

## Impact

- `apps/mobile/src/features/meditation/MeditationScreen.tsx` — 主要改动
