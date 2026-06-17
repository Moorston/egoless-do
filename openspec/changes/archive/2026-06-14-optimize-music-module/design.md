## Context

当前音乐模块使用 expo-audio v1.1.1 作为音频引擎，通过模块级 `audioPlayerRef`（类型为 `any`）在 useAudioEngine hook 和 UI 组件之间共享 player 实例。存在以下问题：

- useAudioEngine 在 MusicScreen、MusicCategoryScreen、MeditationScreen 等多处挂载，每次挂载都会调用 `setAudioModeAsync` 和创建新的 player 实例
- PlayerBar 和 TrackListItem 各自以 250ms 间隔轮询 `audioPlayerRef.current.currentTime`
- AnimatedMusicIcon 使用 RN Animated API 且 `useNativeDriver: false`，动画在 JS 线程运行
- useExerciseAudio 与音乐模块通过直接读取 store 状态手动协调，缺乏统一的音频会话管理
- expo-audio 不支持后台播放和锁屏控制

## Goals / Non-Goals

**Goals:**
- 建立单例音频引擎，全局只挂载一次
- 用事件驱动替代轮询，减少不必要的 re-render
- 统一管理音乐播放与运动环境音的优先级和切换
- 提供强类型 audioPlayerRef interface
- 将 AnimatedMusicIcon 迁移到 Reanimated worklet 动画
- 评估并决定是否引入 react-native-track-player

**Non-Goals:**
- 不重写音乐分类页面 UI
- 不添加歌词、均衡器等新功能
- 不修改 web 端
- 不改变现有的曲目数据结构（MusicTrack）

## Decisions

### D1: 音频引擎单例化 — Context Provider 模式

**选择**：将 useAudioEngine 包装在 `AudioEngineProvider` 中，在 App 顶层挂载一次。

**替代方案**：
- 全局模块级单例（不用 React 生命周期）— 放弃，因为 expo-audio 的 `useAudioPlayer` 是 hook，必须在组件中调用
- 保持现状多处挂载 — 放弃，导致重复初始化和状态不一致

**实现**：
```
App.tsx
  └─ <AudioEngineProvider>     ← 唯一挂载点
       ├─ <NavigationContainer>
       └─ <ExerciseAudioProvider>
```

### D2: 事件驱动进度 — onPlaybackStatusUpdate

**选择**：利用 expo-audio player 的 `onPlaybackStatusUpdate` 回调，在回调中更新 Zustand store 的 `currentTime` 和 `duration`，UI 组件直接从 store 读取。

**替代方案**：
- 保留轮询但增大间隔 — 治标不治本
- 使用 EventEmitter 广播 — 过度设计，Zustand 已有订阅能力

**实现**：
- 在 AudioEngineProvider 中注册 `player.onPlaybackStatusUpdate`
- 回调中更新 store：`set({ currentTime, duration })`
- PlayerBar/TrackListItem 直接 `useMusicStore(s => s.currentTime)` 读取
- 消除所有 `setInterval` 轮询

### D3: react-native-track-player 评估 — 分阶段引入

**选择**：第一阶段保持 expo-audio，修复架构问题；第二阶段引入 react-native-track-player 获得后台播放能力。

**理由**：
- react-native-track-player 提供完整的后台播放、锁屏控制、队列管理
- 但需要 config plugin 和原生配置，变更范围大
- 先用 expo-audio 修复架构问题，验证新架构的正确性，再换底层引擎

**实现**：
- 第一阶段：AudioEngineProvider + 事件驱动 + 类型安全
- 第二阶段：引入 track-player，替换 AudioEngineProvider 内部实现，对外接口不变

### D4: 统一音频会话管理 — AudioSessionManager

**选择**：创建 `AudioSessionManager` 单例，管理音乐播放和运动环境音的优先级。

**优先级规则**：
1. 钟声（bell）— 最高优先级，立即播放，不中断其他
2. 运动环境音 — 中优先级，与音乐互斥
3. 音乐 — 低优先级，被环境音抢占时暂停

**实现**：
- useExerciseAudio 改为通过 AudioSessionManager 请求播放环境音
- Manager 检查当前音乐状态，决定是否暂停音乐
- 环境音停止后自动恢复音乐

### D5: AnimatedMusicIcon 迁移 — Reanimated

**选择**：使用 `react-native-reanimated` 的 `useSharedValue` + `withRepeat` + `withSequence` 替代 RN Animated。

**理由**：
- Reanimated 动画在 UI 线程运行，不会被 JS 线程阻塞
- 项目已依赖 Reanimated（React Navigation 需要）
- `useNativeDriver` 限制不再存在

## Risks / Trade-offs

- **[expo-audio 回调频率]** onPlaybackStatusUpdate 的回调频率可能不足以支撑流畅的进度条动画 → 缓解：实测后如不够，可在回调中同时更新 shared value 驱动动画
- **[AudioSessionManager 复杂度]** 音频优先级逻辑可能在边界情况下出现竞争 → 缓解：使用简单的状态机，明确状态转换
- **[react-native-track-player 迁移]** 换库可能引入新的兼容性问题 → 缓解：在独立分支开发，充分测试后再合并
- **[Reanimated 版本兼容]** 需确认项目当前 Reanimated 版本支持 worklet 动画 → 缓解：检查 package.json 版本，必要时升级
