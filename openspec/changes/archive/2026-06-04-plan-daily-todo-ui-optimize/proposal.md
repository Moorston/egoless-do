## Why

计划详情页的"每日待办"tab 存在几个体验问题：统计区域进度条与数字重复表达同一信息、toggle 开关的交互偏"设置感"而非"待办感"、计划任务与自定义待办混在一起缺乏视觉区分、历史记录展开后过长。这些问题影响日常打卡效率，需要优化。

## What Changes

- 移除统计卡片下方的进度条，保留居中的完成数/总数和日期显示
- 将 36x20 滑动开关替换为 22x22 checkbox 圆圈（空心 → 绿色打勾），触摸区域扩大到 44x44
- 为计划任务和自定义待办添加分组标题（图标 + 名称 + 数量），某类为空时隐藏对应标题
- 历史记录改为手风琴模式：显示全部日期，默认只展开最近一天，其他日期折叠为日期头部

## Capabilities

### New Capabilities
- `todo-checkbox`: 待办项 checkbox 交互组件，替代原有 toggle 开关
- `todo-group-header`: 待办分组标题组件，区分计划任务与自定义待办
- `todo-history-accordion`: 历史记录手风琴展开/折叠组件

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- 平台：仅 Web 端
- 文件：`apps/web/src/components/PlanDetailContent.tsx`（主要改动）
- 文件：`packages/core/src/i18n/zh.ts`、`zh-Hant.ts`、`en.ts`、`types.ts`（如需新增 i18n key）
- 业务逻辑层（`useDailyTodo.ts`、`planTodo.ts`）无需改动
- 不涉及数据模型或 API 变更
