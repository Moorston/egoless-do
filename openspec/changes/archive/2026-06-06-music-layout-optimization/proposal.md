## Why

轻松听页面视觉单调、操作不便。当前布局为扁平列表+tab筛选，缺少视觉层次和交互反馈。需要优化为卡片式分类入口、带波形进度条的曲目列表、收藏功能和播放动态图标。

## What Changes

- 主页改为分类卡片网格布局（背景图+图标+分类名+曲目数），替代原来的 tab+列表
- 新增分类列表页（点击卡片进入），展示该分类下的曲目列表
- 曲目列表项增加波形进度条（SoundCloud 风格竖条波形，已播/未播颜色区分）
- 曲目列表项增加收藏功能（♡ 按钮，收藏到"收藏"分类卡片）
- 播放中曲目和底部播放器使用跳动音符动画替代静态 ▶ 图标
- 底部播放器增加波形进度条，支持点击/拖拽跳转
- 底部播放器在主页和列表页都显示
- 收藏分类作为特殊卡片，收藏的曲目自动归入

**非目标**：
- 不增加"最近播放"功能
- 不增加筛选/排序功能
- 不修改运动进行页的 MusicMiniBar

## Capabilities

### New Capabilities
- `music-layout`: 轻松听页面布局重构——分类卡片网格、分类列表页、曲目列表项设计
- `music-waveform`: 波形进度条组件——固定种子随机波形、已播/未播颜色、拖拽跳转
- `music-favorites`: 收藏功能——收藏状态管理、持久化、收藏分类卡片
- `music-animated-icon`: 播放动态图标——跳动音符动画、播放/静止状态切换

### Modified Capabilities

## Impact

- **平台**: mobile only
- **文件**: apps/mobile/src/features/music/ (MusicScreen, PlayerBar, useMusicStore, 新增组件)
- **导航**: 新增 MusicCategory 路由
- **依赖**: expo-audio (useAudioPlayerStatus 用于进度条)
- **数据**: AsyncStorage 新增 music_favorites key
- **资源**: 需要 4 张分类背景图（专注/冥想/运动/收藏）
