## 需求

冥想页音乐状态展示组件 `MeditationMusicBar`，替代当前内联的简陋显示。

## 空闲态（isActive=false）

- 可点击，点击后触发 `onPress`（打开 MusicPickerModal）
- 左侧：44x44 圆角封面（borderRadius:12）
  - 有歌：LinearGradient 渐变背景 + 白色 icon 22px（来自 TRACK_VISUAL）
  - 无歌：灰色背景 `#e2d9f3` + Music icon 灰色
- 中间：
  - 上行：歌曲名（有歌）或 "选择背景音乐"（无歌），FONT_BODY
  - 下行：分类副标题（有歌）或 "点击试听并选择"（无歌），FONT_SUB，TH.sub 色
- 右侧：ChevronRight 图标

## 打坐中（isActive=true）

- 不可交互
- 左侧：AnimatedMusicIcon 均衡器动画，isPlaying=true，color=primaryColor
- 右侧：歌曲名，FONT_SUB

## i18n

新增 key：
- `medMusicFocus`: '专注 · 自然音' / '專注 · 自然音' / 'Focus · Nature'
- `medMusicMeditate`: '冥想 · 颂钵' / '冥想 · 頌缽' / 'Meditate · Bowls'
- `medMusicExercise`: '运动 · 节奏' / '運動 · 節奏' / 'Exercise · Rhythm'
- `medMusicUser`: '我的音乐' / '我的音樂' / 'My Music'
- `medSelectMusic`: '选择背景音乐' / '選擇背景音樂' / 'Select Background Music'
- `medTapToSelect`: '点击试听并选择' / '點擊試聽並選擇' / 'Tap to preview & select'
