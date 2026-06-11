## Context

冥想页 `MeditationScreen` 中有两处音乐展示：
- 空闲态（line 218-232）：`TouchableOpacity` + Music icon + 歌名 + ChevronRight
- 打坐中（line 196-201）：`View` + Music icon + 歌名

两者都是内联 JSX，样式简陋。运动页使用独立的 `MusicMiniBar` 组件，有播放/暂停/循环控制，但冥想页不需要这些交互。

## Goals / Non-Goals

**Goals:**
- 新建独立的 `MeditationMusicBar` 组件，支持空闲/打坐两种模式
- 空闲态：封面图（TRACK_VISUAL 渐变 + icon）+ 歌名 + 分类副标题 + 箭头
- 打坐中：AnimatedMusicIcon 均衡器动画 + 歌名，不可交互
- 替换 MeditationScreen 中的两处内联音乐显示

**Non-Goals:**
- 不修改 `MusicMiniBar`（运动页继续使用）
- 不修改 `MusicPickerModal`（选择器不变）
- 不添加歌词、进度条等复杂功能
- 不添加渐变背景（用户明确不需要）

## Decisions

### 1. 组件位置

放在 `apps/mobile/src/features/meditation/MeditationMusicBar.tsx`。

理由：这是冥想页专用组件，跟随冥想模块放置。如果未来其他页面也需要，再提取到 music 模块。

### 2. 封面实现

复用 `TRACK_VISUAL`（packages/core/src/constants/music.ts）的 icon 名 + gradient 色值：
- 44x44 圆角方块（borderRadius: 12）
- 背景：`LinearGradient` 从 `gradient[0]` 到 `gradient[1]`
- 中心：白色 icon 22px
- 未选歌时：灰色背景 `#e2d9f3` + Music icon

icon 映射复用 `TrackListItem` 中已有的 `ICON_MAP` 模式。

### 3. 均衡器动画

直接复用 `AnimatedMusicIcon` 组件，传入 `isPlaying={true}` 和 `color={primaryColor}`。

### 4. 分类副标题

根据 `track.category` 显示：
- `focus` → '专注 · 自然音'
- `meditate` → '冥想 · 颂钵'
- `exercise` → '运动 · 节奏'
- `user` → '我的音乐'

使用 i18n key，需要在 `zh.ts`、`zh-Hant.ts`、`en.ts` 添加。

### 5. 组件 Props

```typescript
interface MeditationMusicBarProps {
  track: MusicTrack | null;
  isActive: boolean;
  isPlaying: boolean;
  primaryColor: string;
  onPress?: () => void;
}
```

- `isActive=false`：空闲态，可点击
- `isActive=true`：打坐中，不可交互

## Risks / Trade-offs

- [低] TRACK_VISUAL 只覆盖内置曲目，用户自定义曲目没有 icon 映射 → 使用 Music icon 作为 fallback
- [低] 均衡器动画在打坐中可能分散注意力 → 动画幅度小（4-16px bar），且颜色与主题一致，影响有限
