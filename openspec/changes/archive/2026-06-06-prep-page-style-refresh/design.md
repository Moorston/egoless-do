## Context

PrepPage 当前背景色使用 `SPORT_BG_COLORS[sportName]`（每个运动一个固定色），与应用主题系统脱节。Header 字体偏小、次级文字透明度太高导致可读性差。音效选择器在准备页不必要（运动中暂停页已有）。

## Goals / Non-Goals

**Goals:**
- 背景色跟随主题 primary 色，切换主题时 GO 页面色调统一变化
- Header 字体加大、颜色加深，提升可读性
- 圆圈边框加深，视觉更清晰
- 呼吸引导 toggle 使用主题 accent 色
- 移除 PrepPage 中的音效选择器

**Non-Goals:**
- 不改动运动中页面（ActivePage、PausedPage、ReportPage）
- 不改动音效 hook 和音效文件
- 不改动 web 端

## Decisions

### 1. 背景色：THEMES[theme].primary 替代 SPORT_BG_COLORS

**选择**：通过 `useTheme()` 获取当前主题的 `primary` 色作为背景。

**理由**：
- 与应用整体主题一致，切换主题时页面色调联动
- 减少维护成本（不再需要为每个运动维护独立颜色）

**替代方案**：
- 保留运动色但加渐变 → 仍与主题脱节
- 用 theme bg + primary 渐变 → 过度设计

### 2. GO 按钮文字色同步改为 theme primary

**选择**：GO 按钮 `color: bg` 改为 `color: primary`（与背景色互换）。

**理由**：白底按钮 + 主题色文字，与背景色呼应。

### 3. 呼吸引导 toggle 使用 accent 色

**选择**：ON 状态 `backgroundColor: accent`，OFF 状态保持 `rgba(255,255,255,.2)`。

**理由**：accent 是 primary 的互补色，对比度好且视觉和谐。

### 4. Header 字体升级

**选择**：
- 运动名：`FONT_STAT_CARD` → `FONT_BACK`（约 20px → 24px）
- 次级文字透明度：`.5` → `.8`，`.7` → `.9`

**理由**：运动名是页面最重要的标识，需要更突出。次级文字需要更好的可读性。

### 5. 圆圈边框白色透明度

**选择**：`rgba(255,255,255,.3)` → `rgba(255,255,255,.6)`

**理由**：当前边框太淡，在浅色主题下几乎不可见。

### 6. 移除音效选择器

**选择**：删除 PrepPage 中音效 chip 区块，不传 `selectedSound`/`cycleSound`/`selectSound` 给 PrepPage。

**理由**：音效选择在运动中暂停页已有，准备页重复且分散注意力。

## Risks / Trade-offs

- **运动辨识度降低**：背景色统一后，不同运动不再有独立颜色区分。→ 运动名和 icon 已足够辨识，且主题色本身有区分度。
- **SPORT_BG_COLORS 可能被其他地方引用**：需确认是否有其他页面使用。→ 如果仅 PrepPage 使用，可安全保留常量定义（不删除，避免其他模块引用）。
