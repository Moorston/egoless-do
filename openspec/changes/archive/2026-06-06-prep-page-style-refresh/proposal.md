## Why

锻炼准备页（PrepPage / GO 页面）视觉体验偏弱：Header 字体小且颜色淡，背景色使用固定运动色与主题割裂，背景音乐选择器在准备阶段不必要。需要统一风格、精简交互。

## What Changes

- **Header 字体加大**：运动名从 `FONT_STAT_CARD` 升级到 `FONT_BACK`，次级文字透明度从 `.5`/`.7` 提升到 `.8`/`.9`
- **圆圈边框加深**：白色透明度从 `.3` 提升到 `.6`
- **背景色跟随主题**：从 `SPORT_BG_COLORS[sportName]` 改为 `THEMES[theme].primary`，GO 按钮文字同步
- **呼吸引导 toggle 颜色**：ON 状态从 `COLORS.GREEN` 改为 `THEMES[theme].accent`
- **移除背景音乐选择器**：PrepPage 中的音效 chip 选择器整段移除，hook 和音效文件保留（PausedPage 仍在用）

**非目标**：
- 不改动运动中页面（ActivePage、PausedPage、ReportPage）
- 不改动音效 hook 和音效文件本身
- 不改动 web 端

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

_无需求级变更，仅样式调整_

## Impact

- **平台**：仅 mobile
- **文件**：
  - `apps/mobile/src/features/exercise/pages/PrepPage.tsx` — 主要改动
  - `apps/mobile/src/features/exercise/SportPage.tsx` — bg 传递逻辑调整
  - `packages/core/src/constants.ts` — 可能清理不再需要的 `SPORT_BG_COLORS`（如果其他页面不用）
- **依赖**：无新增依赖
