## Context

当前 app 音频功能分散在冥想页和锻炼页，各自硬编码相同的 6 个环境音 + 1 个钟声，代码重复（`SOUND_FILES` 定义出现两次）。`useExerciseAudio` hook 和 `MeditationScreen` 内的音频逻辑高度相似但未共享。

现有依赖：expo-audio（useAudioPlayer）、expo-file-system（已有）。需要新增 expo-document-picker。

## Goals / Non-Goals

**Goals:**
- 统一音频管理，消除冥想页和锻炼页的音频代码重复
- 提供独立音乐库页面，支持分类浏览和播放内置音乐
- 支持用户导入本地音频文件
- 锻炼活跃页显示音乐迷你播放条

**Non-Goals:**
- 不做在线流媒体/下载
- 不做后台播放（仅 app 前台）
- 不做播放队列/歌单
- 不做 Web 端音乐功能（仅 mobile）

## Decisions

### 1. 全局音乐 store vs 局部状态

**选择**: 全局 Zustand store (`useMusicStore`)

**理由**: 音乐播放需要跨页面保持状态（设置页进入音乐库选曲后返回、锻炼页需要读取当前播放状态）。局部状态会导致页面切换时播放中断。

**替代方案**: React Context — 但 Zustand 已是项目标准状态管理方案，且支持在组件外访问。

### 2. 音频引擎：复用 useAudioPlayer vs 独立 Audio.Sound

**选择**: 继续使用 expo-audio 的 `useAudioPlayer`，封装为 `useAudioEngine`

**理由**: 项目已全面使用 expo-audio，API 简洁。`useAudioPlayer` 支持 `{ uri }` 格式播放用户文件，无需额外依赖。

**注意**: `useAudioPlayer` 是 hook，必须在组件内调用。`useAudioEngine` 作为自定义 hook 包装，提供 `play/pause/stop/seekTo` 等命令式方法。

### 3. 用户文件存储：documentDirectory vs cacheDirectory

**选择**: `FileSystem.documentDirectory/user-music/`

**理由**: documentDirectory 在 app 卸载前持久保留，适合用户主动导入的音乐文件。cacheDirectory 可能被系统清理。

### 4. 用户音乐元数据存储：AsyncStorage vs Zustand persist

**选择**: AsyncStorage 手动读写

**理由**: 与项目现有模式一致（运动音效选择等都用 AsyncStorage）。Zustand persist 中间件也可用，但增加一层抽象无明显收益。

### 5. 内置音乐打包：require() vs 按需下载

**选择**: `require()` 打包在 app bundle 中

**理由**: 现有 7 个 mp3 文件已在 bundle 中，新增音乐量不大。按需下载增加网络依赖和缓存管理复杂度，暂不需要。

### 6. 锻炼页音乐条 vs 替换 ExerciseTopBar 音效选择器

**选择**: 在 ExerciseTopBar 下方新增 MusicMiniBar 组件，保留 ExerciseTopBar 的音效图标作为快捷入口

**理由**: MusicMiniBar 显示更丰富的信息（曲名、播放控制），而 ExerciseTopBar 的音效选择器仍可用于快速切换环境音。两者互补而非替代。

### 7. expo-document-picker 文件过滤

**选择**: 使用 `type: 'audio/*'` 过滤，支持 mp3、wav、m4a、aac

**理由**: 覆盖常见音频格式，document-picker 原生支持 MIME type 过滤。

## 文件结构

```
packages/core/src/
├── constants/music.ts          # 内置音乐定义
│   export interface MusicTrack { id, name, nameEn, category, file?, uri? }
│   export const BUILTIN_TRACKS: MusicTrack[]
│   export const MUSIC_CATEGORIES = ['all','focus','meditate','exercise','my']
│
├── types/music.ts              # 类型导出
│
├── i18n/zh.ts                  # +musicXxx keys
├── i18n/en.ts
├── i18n/zh-Hant.ts
├── i18n/types.ts

apps/mobile/src/features/music/
├── MusicScreen.tsx             # 音乐库主页面
│   ├─ Header: 标题 + 导入按钮 + 返回
│   ├─ CategoryTabs: 全部/专注/冥想/运动/我的
│   ├─ TrackList: FlatList of TrackListItem
│   └─ PlayerBar: 底部播放控制条
│
├── MusicMiniBar.tsx            # 锻炼活跃页迷你播放条
│   ├─ 音乐图标 + 曲名（可点击跳转）
│   └─ 播放/暂停 + 循环按钮
│
├── TrackListItem.tsx           # 单曲列表项组件
│   ├─ 曲名 + 分类标签 + 时长
│   └─ 播放按钮 + (用户音乐) 删除按钮
│
├── PlayerBar.tsx               # 底部播放控制条
│   ├─ 曲名 + 播放/暂停
│   └─ 音量滑块 + 循环切换
│
├── ImportMusicButton.tsx       # 导入按钮 + document-picker 逻辑
│
├── useMusicStore.ts            # Zustand store
│   state: { library, userTracks, currentTrack, isPlaying, volume, loop }
│   actions: { play, pause, resume, stop, setVolume, toggleLoop,
│              addUserTrack, removeUserTrack, loadUserTracks }
│
└── useAudioEngine.ts           # expo-audio 封装
    └─ 内部调用 useAudioPlayer，暴露 play/pause/stop/seekTo

apps/mobile/src/navigation/
├── types.ts                    # + Music: undefined
└── index.tsx                   # + MusicScreen Stack 注册
```

## Zustand Store 设计

```typescript
interface MusicTrack {
  id: string;
  name: string;
  nameEn: string;
  category: 'focus' | 'meditate' | 'exercise' | 'user';
  file?: number;       // require() 结果，内置音乐
  uri?: string;        // 文件 URI，用户导入音乐
}

interface MusicState {
  // 库
  library: MusicTrack[];        // 内置音乐（从 BUILTIN_TRACKS 加载）
  userTracks: MusicTrack[];     // 用户导入（从 AsyncStorage 恢复）

  // 播放状态
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;               // 0~1, default 0.3
  loop: boolean;                // default true

  // Actions
  play: (track: MusicTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  addUserTrack: (name: string, uri: string) => Promise<void>;
  removeUserTrack: (id: string) => Promise<void>;
  loadUserTracks: () => Promise<void>;
  getTracksByCategory: (cat: string) => MusicTrack[];
}
```

## i18n 新增 key

| key | zh | en | zh-Hant |
|-----|----|----|---------|
| musicTitle | 轻松听 | Relax & Listen | 輕鬆聽 |
| musicAll | 全部 | All | 全部 |
| musicFocus | 专注 | Focus | 專注 |
| musicMeditate | 冥想 | Meditate | 冥想 |
| musicExercise | 运动 | Exercise | 運動 |
| musicMy | 我的 | My | 我的 |
| musicImport | 导入音乐 | Import Music | 匯入音樂 |
| musicImportDesc | 从手机导入音频文件 | Import audio from phone | 從手機匯入音訊檔案 |
| musicDelete | 删除 | Delete | 刪除 |
| musicDeleteConfirm | 确定删除这首音乐？ | Delete this music? | 確定刪除這首音樂？ |
| musicPlaying | 正在播放 | Now Playing | 正在播放 |
| musicPaused | 已暂停 | Paused | 已暫停 |
| musicLoop | 循环 | Loop | 循環 |
| musicNoTracks | 暂无音乐 | No music | 暫無音樂 |
| musicEmptyMy | 暂无导入音乐，点击上方按钮导入 | No imported music, tap above to import | 暫無匯入音樂，點擊上方按鈕匯入 |
| musicSection | 音乐 | Music | 音樂 |

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| expo-document-picker 在某些 Android 设备上 MIME type 过滤不生效 | 后处理检查文件扩展名 |
| useAudioPlayer 是 hook，无法在 store action 中直接调用 | useAudioEngine 作为独立 hook 在顶层组件挂载，通过 store action 触发状态变更，engine 监听状态变化执行播放 |
| 用户导入大文件占用存储空间 | 暂不限制，后续可加文件大小上限提示 |
| 内置音乐打包增加 app 体积 | 现有 7 个 mp3 已在 bundle 中，增量可控 |

## Open Questions

1. 用户导入音乐是否需要支持重命名？（当前设计仅使用原始文件名）
2. 音乐迷你条在 GPS 运动（跑步/骑行）的地图页上是否显示？
