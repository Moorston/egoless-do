## Context

当前 `PlanDetailContent.tsx` 的 todo tab 存在以下实现：

- 统计区：居中卡片（标题 + 5/8 + 日期）+ 独立进度条（第 413-430 行）
- 待办列表：toggle 开关（36x20 div 实现，第 452-465 行和 498-513 行）
- 计划任务与自定义待办：通过 `borderBottom` 分隔线区分（第 446 行和 493 行）
- 历史记录：timeline 样式，全部展开（第 579-644 行）

业务逻辑层 `useDailyTodo.ts` 和 `planTodo.ts` 不需要改动，所有变更集中在 UI 层。

## Goals / Non-Goals

**Goals:**
- 提升每日打卡的操作效率和视觉清晰度
- 用 checkbox 替代 toggle，使交互更符合待办场景
- 通过分组标题让两类待办一目了然
- 历史记录默认折叠减少滚动距离

**Non-Goals:**
- 不改动 `useDailyTodo.ts` 或 `planTodo.ts` 等业务逻辑
- 不涉及移动端（Expo）改动
- 不增加拖拽排序或新功能

## Decisions

### 1. Checkbox 组件：内联实现 vs 独立组件

**选择：内联实现**

理由：当前代码中 toggle 也是内联 div 实现的（非独立组件），保持一致风格。Checkbox 的样式逻辑简单（两个状态 + 动画），不值得单独抽组件。如果后续其他页面也需要 checkbox，再提取不迟。

实现细节：
- 外层 div：44x44 触摸区域（padding 11px），`cursor: pointer`
- 内层 div：22x22 圆角方形（border-radius 6px），`transition: all .2s`
- 未完成态：`border: 2px solid TH.border`，背景透明
- 已完成态：`background: COLORS.GREEN`，内嵌 `<Check size={14} color="#fff" />`
- 完成动画：`transform: scale(1.1)` 弹跳，200ms 后恢复

### 2. 分组标题：独立区块 vs 列表内嵌

**选择：列表内嵌**

理由：分组标题作为列表的一部分渲染，不需要额外的容器 div 或边框。标题行用 `padding: '8px 12px 4px'` 与待办项对齐，视觉上是列表的"节标题"。

实现细节：
- 计划任务标题：`<ClipboardList size={14}>` + `"每日待办 (N)"`，仅当 `todayItems.length > 0` 时渲染
- 自定义待办标题：`<Pencil size={14}>` + `"每日自定义待办 (N)"`，仅当 `dailyCustomTodos.length > 0` 时渲染
- 两者都为空时显示空状态提示（已有逻辑）

### 3. 历史手风琴：状态管理方式

**选择：`useState<Set<string>>` 管理展开的日期集合**

理由：
- 使用 Set 而非单个 boolean，支持多天同时展开
- 默认值为最近一天的日期：`new Set([historyGroups[0]?.date])`
- 点击日期行 toggle 对应日期的展开状态
- 头部箭头：展开时 `ChevronDown`，折叠时 `ChevronRight`

替代方案（单 boolean `showAllDetail`）：无法支持"展开某一天查看详情"的场景，不灵活。

### 4. i18n key 处理

**选择：不新增 key**

理由：分组标题复用已有 key（`planTodoList` + `planDailyCustomTodos`），数量用模板字符串拼接。手风琴的箭头图标是纯视觉元素，不需要文字标签。因此不需要新增 i18n key。

## Risks / Trade-offs

- **[Checkbox 触摸区域]** 44x44 的 padding 可能在密集列表中增加行高 → 实际影响很小，当前行高已有 10px padding，增加 11px 不会溢出
- **[手风琴状态丢失]** 切换 tab 或返回后展开状态重置 → 可接受，因为每次进入 todo tab 默认展开最近一天是合理的默认行为
- **[分组标题在空列表时]** 需要条件渲染避免显示"计划任务 (0)" → 已在设计中处理
