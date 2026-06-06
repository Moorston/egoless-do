## Context

轻松听模块已完成基础功能（music-module change），当前 MusicScreen 为 tab 筛选 + FlatList 列表布局，视觉单调且操作不便。需要重构为卡片式分类入口 + 分类列表页 + 波形进度条 + 收藏功能 + 播放动画。

现有技术栈：expo-audio (useAudioPlayer + useAudioPlayerStatus)、Zustand store、React Navigation、lucide-react-native 图标。

## Goals / Non-Goals

**Goals:**
- 主页用分类卡片网格替代 tab+列表，每张卡片有背景图
- 点击卡片进入分类列表页，展示曲目列表+波形进度条
- 曲目支持收藏，收藏归入"收藏"分类卡片
- 播放中使用跳动音符动画
- 底部播放器带波形进度条，主页和列表页都显示

**Non-Goals:**
- 不做"最近播放"
- 不做筛选/排序
- 不改运动页 MusicMiniBar
- 不改音频播放引擎逻辑

## Decisions

### 1. 波形数据生成：固定种子伪随机

每首曲目用 `track.id` 作为随机种子，生成固定高度数组（8~24px）。保证同一首曲子每次打开波形一致，避免视觉跳动。

方案对比：
- 真实音频波形分析：需解析音频文件，复杂且性能差 → 不采用
- 固定种子伪随机：简单、性能好、视觉一致 → 采用

### 2. 进度条交互：Pressable 点击跳转

用 Pressable 组件检测点击位置，计算对应时间比例，调用 `player.seekTo()` 跳转。不做拖拽（PanResponder 复杂度高，收益低）。

### 3. 播放动画：Animated 循环

3 个竖条 Animated.View，各自用 `Animated.loop` + `Animated.sequence` 交错执行高度动画。停止播放时动画停止。用 `useNativeDriver: false`（因为动画 height 属性不支持 native driver）。

### 4. 收藏持久化：AsyncStorage

favorites 存储为 `string[]`（track id 数组），key: `music_favorites`。在 useMusicStore 中管理，与 userTracks 共用 load/save 模式。

### 5. 分类卡片背景图：require() 静态资源

4 张图片放在 `assets/music-covers/` 目录，通过 `require()` 加载。收藏卡片使用渐变色兜底（无专属图片）。

### 6. 底部播放器共享：提取 PlayerContext

底部播放器需要在 MusicScreen 和 MusicCategoryScreen 都显示。方案：将 PlayerBar 作为两个页面的共同子组件渲染，不使用 Context。两个页面各自 import PlayerBar 即可。

## Risks / Trade-offs

- **波形固定种子** → 同曲目波形相同，但无法反映真实音频特征。可接受，因为视觉一致性更重要。
- **Pressable 而非拖拽** → 无法实时预览拖拽位置。可接受，点击跳转已够用。
- **Animated 不用 native driver** → height 动画在 JS 线程执行，可能有轻微卡顿。3 个竖条开销极小，可接受。
- **背景图资源** → 需要用户提供 4 张图片，否则用渐变色兜底。
