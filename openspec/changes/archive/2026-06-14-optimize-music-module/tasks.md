## 1. 类型定义与基础设施

- [x] 1.1 定义 AudioPlayerRef interface，替换 audioPlayerRef.ts 中的 `any` 类型（`apps/mobile/src/features/music/audioPlayerRef.ts`）
- [x] 1.2 在 useMusicStore 中添加 `currentTime` 和 `duration` 字段（`apps/mobile/src/features/music/useMusicStore.ts`）
- [x] 1.3 检查项目 react-native-reanimated 版本，确认支持 worklet 动画（`apps/mobile/package.json`）

## 2. 音频引擎单例化

- [x] 2.1 创建 AudioEngineProvider 组件，将 useAudioEngine 逻辑迁移到 Provider 内部（`apps/mobile/src/features/music/AudioEngineProvider.tsx`）
- [x] 2.2 在 AudioEngineProvider 中注册 onPlaybackStatusUpdate 回调，更新 store 的 currentTime/duration
- [x] 2.3 在 App 顶层挂载 AudioEngineProvider，移除 MusicScreen/MusicCategoryScreen/MeditationScreen 中的 useAudioEngine 调用

## 3. 事件驱动进度系统

- [x] 3.1 PlayerBar 移除 setInterval 轮询，改为从 store 读取 currentTime/duration（`apps/mobile/src/features/music/PlayerBar.tsx`）
- [x] 3.2 TrackListItem 移除 setInterval 轮询，改为从 store 读取进度（`apps/mobile/src/features/music/TrackListItem.tsx`）
- [x] 3.3 验证 WaveformBar 进度条动画流畅度，必要时调整 onPlaybackStatusUpdate 频率

## 4. 音频会话管理器

- [x] 4.1 创建 AudioSessionManager 单例，实现音频源优先级状态机（`apps/mobile/src/features/music/AudioSessionManager.ts`）
- [x] 4.2 实现音乐与运动环境音的互斥切换逻辑（暂停/恢复音乐）
- [x] 4.3 重构 useExerciseAudio，通过 AudioSessionManager 请求播放（`apps/mobile/src/features/exercise/hooks/useExerciseAudio.ts`）
- [x] 4.4 移除 useExerciseAudio 中直接操作 bgPlayer 的逻辑，统一通过 manager 控制

## 5. 动画升级

- [x] 5.1 将 AnimatedMusicIcon 从 RN Animated 迁移到 Reanimated worklet 动画（`apps/mobile/src/features/music/AnimatedMusicIcon.tsx`）
- [x] 5.2 验证动画在 JS 线程繁忙时仍保持流畅

## 6. Store 健壮性

- [x] 6.1 为 useMusicStore 的异步 action（addUserTrack/removeUserTrack/loadUserTracks/loadFavorites）添加 try-catch 错误处理
- [x] 6.2 为 audioPlayerRef 的访问添加空值检查，避免 player 为 null 时崩溃

## 7. 集成测试

- [ ] 7.1 验证音乐播放 → 锁屏 → 解锁后播放状态正确
- [ ] 7.2 验证音乐播放中切换到运动页 → 环境音开始 → 音乐暂停 → 返回 → 音乐恢复
- [ ] 7.3 验证 PlayerBar 和 TrackListItem 进度条同步且无卡顿
- [ ] 7.4 验证 AnimatedMusicIcon 动画流畅度
