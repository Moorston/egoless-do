## Why

"轻松听音乐"模块存在架构和性能缺陷：audioPlayerRef 类型为 any、useAudioEngine 多处挂载导致状态不一致、PlayerBar 和 TrackListItem 各自 250ms 轮询 currentTime 造成性能浪费、AnimatedMusicIcon 使用 `useNativeDriver: false` 的旧动画 API。更关键的是，当前 expo-audio 缺少后台播放和锁屏控制能力，用户锁屏后音乐中断，体验不佳。需要从架构层到 UX 层全面优化，并评估是否引入 react-native-track-player 以获得完整的后台播放能力。

## What Changes

- **统一音频引擎架构**：将 audioPlayerRef 从 `any` 改为强类型 interface，将 useAudioEngine 从 hook 改为单例模式或 Context Provider，避免多处挂载
- **消除轮询**：用事件驱动机制替代 PlayerBar 和 TrackListItem 中 250ms 的 setInterval 轮询
- **升级动画**：AnimatedMusicIcon 从 RN Animated（`useNativeDriver: false`）迁移到 Reanimated worklet 动画
- **统一音频会话管理**：整合 useExerciseAudio 中的并行音频系统，建立统一的音频会话管理器
- **增强播放器 UX**：添加音量控制 UI、改进播放状态持久化、优化列表交互
- **类型安全**：定义完整的 Track interface，为 store action 添加错误处理

## 非目标

- 不重写音乐分类页面的 UI 布局
- 不添加歌词显示、均衡器等新功能
- 不修改 web 端的音频功能

## Capabilities

### New Capabilities
- `audio-session-manager`: 统一音频会话管理器，协调音乐播放与运动环境音的优先级，处理后台播放和音频中断
- `audio-progress-events`: 事件驱动的播放进度系统，替代轮询机制，提供 currentTime/duration 的实时更新

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- **依赖变更**：可能引入 `react-native-track-player`（如评估后决定替换 expo-audio），引入 `react-native-reanimated`（AnimatedMusicIcon 迁移）
- **代码变更**：`apps/mobile/src/features/music/` 下约 8 个文件重构，`apps/mobile/src/features/exercise/hooks/useExerciseAudio.ts` 重构
- **平台**：仅影响 mobile 端
- **Breaking**：audioPlayerRef 类型变更会影响所有直接引用它的组件（PlayerBar、TrackListItem）
