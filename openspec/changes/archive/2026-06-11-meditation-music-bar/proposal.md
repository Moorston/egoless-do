## Why

冥想页当前的音乐展示非常朴素——空闲态只有一行文字+箭头，打坐中只有一个 icon+歌名。相比运动页的 MusicMiniBar，冥想页缺少视觉层次和音乐氛围感。需要一个独立的冥想音乐状态组件，带封面图、均衡器动画，参考 QQ/网易云音乐的 Mini Bar 风格。

## What Changes

- 新建 `MeditationMusicBar` 组件，两种模式：
  - **空闲态**：封面图（TRACK_VISUAL icon + 渐变）+ 歌曲名 + 分类副标题 + 箭头，点击打开 MusicPickerModal
  - **打坐中**：AnimatedMusicIcon 均衡器 + 歌曲名，不可交互
- 冥想页 `MeditationScreen` 中替换原有的两处内联音乐显示为新组件
- 不修改 `MusicMiniBar`，冥想页使用独立组件

## Capabilities

### New Capabilities
- `meditation-music-bar`: 冥想页独立音乐状态组件，含封面展示、均衡器动画、空闲/打坐双模式

### Modified Capabilities

## Impact

- 新增文件：`apps/mobile/src/features/meditation/MeditationMusicBar.tsx`
- 修改文件：`apps/mobile/src/features/meditation/MeditationScreen.tsx`（替换内联显示为新组件）
- 依赖：复用 `TRACK_VISUAL`、`AnimatedMusicIcon`、`useTheme`、`useT` 等已有模块，无新依赖
