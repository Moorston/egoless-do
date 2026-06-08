## 1. PrepPage 样式优化

- [x] 1.1 PrepPage 背景色改为 `THEMES[theme].primary`，通过 `useTheme()` 获取
- [x] 1.2 GO 按钮文字色从 `bg` 改为 `THEMES[theme].primary`
- [x] 1.3 运动名字体从 `FONT_STAT_CARD` 改为 `FONT_BACK`
- [x] 1.4 次级文字透明度提升：`.5` → `.8`，`.7` → `.9`
- [x] 1.5 圆圈边框白色透明度从 `.3` 提升到 `.6`
- [x] 1.6 呼吸引导 toggle ON 状态颜色从 `COLORS.GREEN` 改为 `THEMES[theme].accent`

## 2. 移除背景音乐选择器

- [x] 2.1 PrepPage 中音效 chip 选择器区块删除
- [x] 2.2 PrepPage props 中 `selectedSound`/`cycleSound`/`selectSound` 相关代码清理

## 3. SportPage bg 传递调整

- [x] 3.1 SportPage 中 `bg` 变量从 `SPORT_BG_COLORS[sportName]` 改为 `THEMES[theme].primary`，传递给 PrepPage
