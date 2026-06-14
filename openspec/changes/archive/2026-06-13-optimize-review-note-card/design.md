## Context

`ReviewNoteCard.tsx` 是复盘 tab 中展示复盘笔记的卡片组件。当前实现：
- 简单的 bordered card，header 显示来源+日期+删除按钮
- 引导问题用斜体显示
- 内容截断 80 字符，点击展开
- 标签用 # 前缀纯文本
- 无编辑功能

数据来源：`TrailNote` 接口（`id, trailId, content, tags, mood, source, guidedQuestion, order, createdAt, updatedAt`）

已有 `updateTrailNote(noteId, patch)` store action 可用于编辑。

## Goals / Non-Goals

**Goals:**
- 引导问题作为卡片标题，提升信息层次
- 左侧彩色边框区分引导式/自由反思
- 标签改为 pill 样式
- 长按菜单替代常驻删除按钮
- 展开/收起提示
- 显示具体时间
- 新增编辑功能（内联编辑区）
- 心情图标放大并放在标签行右侧

**Non-Goals:**
- 不修改 WriteNoteModal
- 不修改 TrailNote 数据结构
- 不影响其他页面

## Decisions

### 1. 引导问题作为卡片标题

**选择**: 引导问题（如有）显示为卡片第一行，字号略大，加粗。无引导问题时显示「自由反思」作为标题。

**理由**: 引导问题是复盘的切入点，作为标题让用户一眼知道这条复盘在回应什么问题。

### 2. 左侧彩色边框

**选择**: `borderLeftWidth: 3`，引导式用 `TH.primary`，自由反思用 `#10B981`（绿色）。

**理由**: 视觉上快速区分两种复盘类型，不需要阅读文字。

### 3. 长按菜单

**选择**: 使用 React Native 的 `Modal` + 自定义菜单项实现长按菜单，包含编辑、复制、删除三个选项。

**替代方案**: 使用 `react-native-context-menu` 等第三方库 — 增加依赖，且自定义程度有限。

### 4. 编辑模式

**选择**: 长按→编辑后，卡片原地展开内联编辑区，包含：
- 多行 TextInput（内容）
- 标签编辑（pill 样式，可删除/添加）
- 心情选择器（emoji 行）
- 取消/保存按钮

**理由**: 原地编辑不跳页面，保持上下文连续性。复用已有的 `updateTrailNote` action。

### 5. 标签 pill 样式

**选择**: 浅色填充背景 + 圆角 + 深色文字，如 `[ #反思 ]`。

**样式**: `backgroundColor: TH.primary + '15'`, `borderRadius: 12`, `paddingHorizontal: 10`, `paddingVertical: 4`。

### 6. 展开/收起提示

**选择**: 内容截断时末尾显示「展开 ▾」文字按钮，展开后显示「收起 ▴」。

**理由**: 让用户知道内容可以交互，而非静态截断。

### 7. 时间显示

**选择**: 始终显示日期+时间（如「6月13日 14:30」），不区分同一天/不同天。

**理由**: 简化逻辑，且时间信息对复盘回顾有价值。

## Risks / Trade-offs

- **[Risk] 长按菜单与 ScrollView 滚动冲突** → 使用 `onLongPress` 而非手势系统，避免冲突
- **[Risk] 编辑模式下卡片高度变化导致布局跳动** → 使用动画过渡，或固定编辑区最小高度
- **[Risk] 标签编辑的 UX 复杂度** → 保持简单：显示现有标签（可点 X 删除）+ 一个添加输入框
