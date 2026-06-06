## 1. 数据层：类型、常量、i18n

- [x] 1.1 创建 `packages/core/src/types/music.ts`，定义 MusicTrack 接口
- [x] 1.2 创建 `packages/core/src/constants/music.ts`，定义 BUILTIN_TRACKS（分类：focus/meditate/exercise）、MUSIC_CATEGORIES
- [x] 1.3 在 `packages/core/src/i18n/types.ts` 新增 musicXxx 相关 key 类型
- [x] 1.4 在 `packages/core/src/i18n/zh.ts`、`en.ts`、`zh-Hant.ts` 新增音乐模块 i18n 翻译
- [x] 1.5 在 `packages/core/src/types/index.ts` 和 `constants.ts` 导出新类型和常量

## 2. 全局音乐 Store

- [x] 2.1 创建 `apps/mobile/src/features/music/useMusicStore.ts`，实现 Zustand store：library、userTracks、currentTrack、isPlaying、volume、loop 状态及 actions
- [x] 2.2 实现 `loadUserTracks`：从 AsyncStorage 读取 `user_music_library`，恢复用户音乐列表
- [x] 2.3 实现 `addUserTrack`：生成 UUID，写入 AsyncStorage，加入 state
- [x] 2.4 实现 `removeUserTrack`：从 AsyncStorage 移除，删除沙盒文件，更新 state

## 3. 音频引擎

- [x] 3.1 创建 `apps/mobile/src/features/music/useAudioEngine.ts`，封装 expo-audio useAudioPlayer，支持内置音乐（require）和用户音乐（{ uri }）
- [x] 3.2 实现 play/pause/resume/stop/seekTo 命令式方法，与 useMusicStore 状态联动
- [x] 3.3 实现音量和循环控制，监听 store 的 volume/loop 变同步到播放器

## 4. 音乐库页面

- [x] 4.1 创建 `apps/mobile/src/features/music/TrackListItem.tsx`：曲名、分类标签、播放按钮、删除按钮（用户音乐）
- [x] 4.2 创建 `apps/mobile/src/features/music/ImportMusicButton.tsx`：调用 expo-document-picker 选择音频文件，拷贝到 documentDirectory/user-music/，调用 store addUserTrack
- [x] 4.3 创建 `apps/mobile/src/features/music/PlayerBar.tsx`：底部播放控制条（曲名、播放/暂停、音量滑块、循环切换）
- [x] 4.4 创建 `apps/mobile/src/features/music/MusicScreen.tsx`：Header（标题+导入按钮+返回）、分类 Tab、TrackList（FlatList）、底部 PlayerBar
- [x] 4.5 处理空状态："我的"Tab 无音乐时显示导入引导提示

## 5. 音乐迷你条

- [x] 5.1 创建 `apps/mobile/src/features/music/MusicMiniBar.tsx`：音乐图标+曲名、播放/暂停按钮、循环按钮，点击曲名跳转 MusicScreen

## 6. 导航注册

- [x] 6.1 在 `apps/mobile/src/navigation/types.ts` 新增 `Music: undefined` 路由
- [x] 6.2 在 `apps/mobile/src/navigation/index.tsx` 注册 MusicScreen 到 Stack Navigator

## 7. 入口集成

- [x] 7.1 在 `apps/mobile/src/features/settings/SettingsScreen.tsx` 新增"音乐"section，包含"轻松听"行项，点击导航至 MusicScreen
- [x] 7.2 在 `apps/mobile/src/features/meditation/MeditationScreen.tsx` 准备阶段新增"轻松听"入口，选择音乐后显示已选曲名，开始冥想时调用 store.play()
- [x] 7.3 在 `apps/mobile/src/features/exercise/layouts/types.ts` 的 ExerciseLayoutProps 中新增音乐相关 props（currentTrack、isPlaying、onTogglePlay、onToggleLoop）

## 8. 锻炼页集成

- [x] 8.1 在 `apps/mobile/src/features/exercise/layouts/EnduranceActive.tsx` 的 ExerciseTopBar 下方集成 MusicMiniBar
- [x] 8.2 在 `apps/mobile/src/features/exercise/layouts/MeditativeActive.tsx` 集成 MusicMiniBar
- [x] 8.3 在 `apps/mobile/src/features/exercise/layouts/StrengthActive.tsx` 集成 MusicMiniBar
- [x] 8.4 修改 `apps/mobile/src/features/exercise/SportPage.tsx`，从 useMusicStore 读取播放状态，传递音乐 props 给 layout
- [x] 8.5 修改 `apps/mobile/src/features/exercise/hooks/useExerciseAudio.ts`，改为调用 useMusicStore 的 play/pause，保持 bell 提示音独立

## 9. 依赖安装

- [x] 9.1 安装 expo-document-picker 依赖
