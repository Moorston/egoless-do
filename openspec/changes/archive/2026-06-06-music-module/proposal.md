## Why

当前 app 的音频功能分散在冥想页和锻炼页，各自硬编码相同的 6 个环境音，代码重复且无法扩展。用户需要一个统一的音乐模块来浏览、播放专注/冥想/运动放松音乐，并支持导入本地音频文件作为个性化背景音乐。

## What Changes

- 新增独立音乐库页面 `MusicScreen`，支持按分类浏览内置音乐（专注、冥想、运动）、播放控制、循环播放
- 支持用户从手机本地导入音频文件（mp3/wav/m4a/aac），拷贝到 app 沙盒持久化
- 新增全局音乐状态管理 `useMusicStore`（Zustand），统一管理播放状态、音量、曲目列表
- 封装共享音频引擎 `useAudioEngine`，基于 expo-audio，替代冥想页和锻炼页各自重复的音频逻辑
- 设置页新增"音乐"section，包含"轻松听"入口
- 冥想页新增"轻松听"入口，可选择音乐作为冥想背景
- 锻炼活跃页顶部新增 `MusicMiniBar` 音乐迷你播放条，显示当前曲目和播放控制
- 内置音乐从现有 7 个 mp3 重新分类（专注/冥想/运动），新增 i18n key 支持多语言

**非目标（不做）：**
- 不做在线流媒体/音乐下载
- 不做音乐推荐/AI 生成
- 不做后台播放（仅 app 前台时播放）
- 不做播放队列/歌单功能
- 不做音乐编辑/裁剪

## Capabilities

### New Capabilities
- `music-library`: 音乐库浏览、分类、搜索，内置音乐定义，用户导入音乐管理
- `music-playback`: 全局音频播放引擎，播放/暂停/音量/循环控制，跨页面播放状态共享
- `music-import`: 用户本地音频文件导入，文件拷贝到沙盒，元数据持久化

### Modified Capabilities
- `sport-active-page`: 锻炼活跃页顶部新增音乐迷你播放条，替换原有的 ExerciseTopBar 内联音效选择器

## Impact

- **平台**: 仅 mobile（apps/mobile）
- **新增文件**:
  - `apps/mobile/src/features/music/` — 音乐模块全部组件和 hooks
  - `packages/core/src/constants/music.ts` — 内置音乐定义
  - `packages/core/src/types/music.ts` — MusicTrack 类型
- **修改文件**:
  - `apps/mobile/src/navigation/types.ts` — 新增 Music 路由
  - `apps/mobile/src/navigation/index.tsx` — 注册 MusicScreen
  - `apps/mobile/src/features/settings/SettingsScreen.tsx` — 新增音乐 section
  - `apps/mobile/src/features/meditation/MeditationScreen.tsx` — 新增音乐入口，复用全局音频引擎
  - `apps/mobile/src/features/exercise/layouts/*.tsx` — 活跃页集成 MusicMiniBar
  - `apps/mobile/src/features/exercise/shared/ExerciseTopBar.tsx` — 简化，音效选择移至音乐模块
  - `apps/mobile/src/features/exercise/hooks/useExerciseAudio.ts` — 改为调用全局音乐 store
  - `packages/core/src/i18n/*.ts` — 新增音乐相关 i18n key
- **依赖**: expo-audio（已有）、expo-document-picker（新增）、expo-file-system（已有）
