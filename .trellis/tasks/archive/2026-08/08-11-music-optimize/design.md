# 音乐模块优化 — 技术设计

## 架构总览

```
现有结构:
MusicScreen (主页) ── PlayerBar (底部播放器)
MusicCategoryScreen (分类) ── TrackListItem
MusicLibraryScreen (下载/缓存)
useMusicStore (Zustand) ← MusicPlaybackService/StorageService/TimerService
```

## 设计决策

### 1. 全屏播放器（FullPlayerScreen）

**方案**：新增 `FullPlayerScreen` 组件，作为 Modal 或独立路由。

- 采用 **Modal**（避免新增导航路由，复用 PlayerBar 的触发逻辑）
- Transition：`animationType="slide"`（从底部滑入）
- 手势下滑关闭：用 `PanResponder` 监听 Y 轴位移
- 布局：
  - 背景：曲目渐变色的深色变体（`TRACK_VISUAL.gradient`）
  - 中央：大尺寸 AnimatedMusicIcon（size 120）
  - 曲目名 + 时长
  - 进度条（WaveformBar，支持拖动）
  - 控制行：上一首/播放暂停/下一首
  - 底部：播放模式 + 音量 + 睡眠定时器

**数据流**：从 `useMusicStore` 读取 currentTrack/isPlaying/currentTime/duration，调用 play/pause/resume/playNext/playPrevious/setPlayMode/setVolume。

### 2. 进度条拖动

- 扩展 `WaveformBar` 支持拖动
- 方案：在 WaveformBar 外包 `PanResponder`，onStartShouldSetPanResponder 返回 true
- onPanResponderMove 根据触摸 X 坐标计算比例，调用 `onSeek(ratio)`
- 拖动时显示 `formatPreviewTime(ratio * duration)` 预览

### 3. 搜索功能

- 在 MusicCategoryScreen 头部添加 TextInput（ThemedInput）
- 状态：`searchQuery state`
- 过滤：`tracks.filter(t => t.name.includes(query) || t.nameEn?.includes(query))`

### 4. 排序功能

- 状态：`sortType state`（'default' | 'name' | 'duration'）
- 排序按钮：点击循环切换排序方式
- 用 `useMemo` 缓存排序结果

### 5. 队列管理

- 在 PlayerBar 添加队列按钮（List icon）
- Modal 展示 `queue` + `queueIndex`
- 支持：点击跳转（setQueue + play）、删除（本地状态过滤）
- 注意：删除队列需要 store action，或直接在商店层实现 `removeFromQueue(index)`

### 6. 最近播放记录

- 在 `useMusicStore` 添加 `recentlyPlayed: string[]`（track id 数组，最多 20 条）
- `play()` 时更新：去重、插入头部、截断 20
- **持久化**：存到 MusicStorageService（`recently_played.json`）
- MusicScreen 主页显示最近播放（水平滚动列表）

### 7. 界面视觉优化

- Now Playing 卡片：加阴影（boxShadow）、渐变背景、更大图标
- 播放/暂停：用 `AnimatedMusicIcon` 已有动画，优化尺寸和颜色
- 空状态：统一图标样式

### 8. 批量操作

- MusicCategoryScreen 支持多选模式
- 状态：`selectionMode` + `selectedIds: Set<string>`
- 长按 TrackListItem 进入多选模式
- 批量删除：调 `removeUserTrack` 循环删除

### 9. 导入优化

- ImportMusicButton 导入成功后，MusicLibraryScreen/MusicScreen 刷新列表
- 添加导入进度 Toast（用现有 showToast 或 Alert）

## 数据模型变更

`useMusicStore` 新增：
```typescript
recentlyPlayed: string[];              // 最近播放的 track id
removeFromQueue: (index: number) => void;  // 队列删除

// 新增 action
play(track) 时更新 recentlyPlayed
```

## Store 变更

- `MusicStorageService` 新增 `loadRecentlyPlayed` / `saveRecentlyPlayed`
- `MusicPlaybackService` 或 store 层处理最近播放逻辑

## 风险与回滚

- 全屏播放器、队列管理是新增功能，独立可回滚
- 搜索/排序是纯 UI 层，无风险
- 最近播放新增持久化，需处理旧数据兼容（缺省为 []）
- 每个功能独立提交，可单独 revert

## 文件清单

### 新增文件
| 文件 | 用途 |
|------|------|
| `media/components/FullPlayerScreen.tsx` | 全屏播放器 |
| `media/components/QueueModal.tsx` | 播放队列管理 |
| `media/components/SearchSortBar.tsx` | 搜索+排序栏 |

### 修改文件
| 文件 | 修改 |
|------|------|
| `media/components/WaveformBar.tsx` | 支持拖动 seek |
| `media/components/PlayerBar.tsx` | 全屏播放器触发 + 队列按钮 |
| `media/screens/MusicScreen.tsx` | Now Playing 卡片优化 + 最近播放 |
| `media/screens/MusicCategoryScreen.tsx` | 搜索/排序/多选 |
| `media/components/TrackListItem.tsx` | 长按多选 + 进度条 |
| `media/useMusicStore.ts` | 最近播放状态 + removeFromQueue |
| `media/services/MusicStorageService.ts` | 最近播放持久化 |
| `media/components/ImportMusicButton.tsx` | 导入进度提示 |