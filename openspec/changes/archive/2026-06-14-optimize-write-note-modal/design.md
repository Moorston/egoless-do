## Context

`WriteNoteModal.tsx` 是复盘写作弹窗组件，用于引导式复盘和自由反思复盘。当前实现：
- 内容输入 minHeight 120px
- 标签输入：独立输入框 + + 按钮
- 心情：emoji 直接展示（😊🌿😰😢🎉🙏💭），无文字说明
- 引导问题：虚线边框小字展示
- 无字数统计
- 无草稿保护
- 无复盘思路联动

数据来源：
- `guidedQuestion?: string` — 引导问题
- `onSave` 回调参数：`{ content, tags, mood, source, guidedQuestion }`
- `trail.reviewCache?.perspectives` — AI 生成的复盘思路（需新增传入）

## Goals / Non-Goals

**Goals:**
- 提升写作体验（更大的输入区、字数统计）
- 优化标签和心情的交互
- 展示 AI 复盘思路，辅助写作
- 引导问题更突出
- 草稿保护

**Non-Goals:**
- 不修改 onSave 参数格式
- 不修改 TrailNote 数据结构
- 不影响其他弹窗

## Decisions

### 1. 内容输入区高度

**选择**: minHeight 从 120px 增加到 200px

**理由**: 复盘需要足够的写作空间，200px 约可显示 6-8 行文字，比 120px 更舒适。

### 2. 字数统计

**选择**: 在内容输入框右下角显示「已写 N 字」，实时更新。

**理由**: 让用户了解写作量，不需要额外空间。

### 3. 标签输入

**选择**: 合并为单个 TextInput，placeholder 显示「输入标签，回车添加」，onSubmitEditing 触发添加。

**理由**: 减少 UI 元素，回车添加比点按钮更直觉。

### 4. 心情选择

**选择**: 使用 `getMoodIcon(mood)` 获取 emoji，同时显示中文标签。

**选项**: `['happy', 'calm', 'neutral', 'sad', 'anxious', 'grateful']`

**标签映射**:
- happy → 开心
- calm → 平静
- neutral → 平常
- sad → 难过
- anxious → 焦虑
- grateful → 感恩

**理由**: emoji 无文字说明时用户可能不理解含义。

### 5. 复盘思路展示

**选择**: 新增 `reviewPerspectives?: string[]` prop，从 ThoughtTrailDetailScreen 传入 `trail.reviewCache?.perspectives`。展示为可折叠区块，默认展开。

**理由**: 用户写作时可以参考 AI 给出的多维度思路，提升复盘质量。

### 6. 引导问题展示

**选择**: 引导式时，引导问题改为独立高亮区块，使用更大字号和加粗，背景色加深。

**理由**: 引导问题是复盘的核心锚点，需要更突出。

### 7. 草稿保护

**选择**: handleClose 时检查 content 是否非空，非空则弹出 Alert 确认「放弃当前草稿？」

**理由**: 防止误关导致内容丢失。

## Risks / Trade-offs

- **[Risk] 弹窗高度增加** → 保持 maxHeight: '85%'，ScrollView 自适应
- **[Risk] 复盘思路为空时的展示** → 不传入时不显示该区块
- **[Risk] 心情选项与 ReviewNoteCard 不一致** → 统一使用 Mood 类型
