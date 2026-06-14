## Why

快速创建脉络页面的检索流程需要进一步优化：当前每次输入都自动触发 AI 搜索（费 token、费时间），需要把 AI 搜索的控制权还给用户。同时筛选条件（时间/标签/心情）和搜索输入框是分离的，用户看不到完整的搜索条件。

## What Changes

- 搜索流程改为"本地优先，AI 按需"：默认只跑 RAG 本地检索（Phase 1），左下角增加 AI 检索按钮，用户点击后才触发 AI 搜索（Phase 2 + Phase 3）
- 筛选条件（下拉框选中内容）注入到搜索输入框中，用户可以点击搜索

## Non-Goals

- 不改变三阶段检索管线的核心逻辑（RAG → 意图理解 → 语义扩展）
- 不改变 SmartQueryBubble 追问机制
- 不改变搜索历史、分页、AI 降级指示等已有功能
- 不涉及 Web 端改动

## Capabilities

### New Capabilities

- `on-demand-ai-search`: 本地优先搜索流程 + AI 按需触发按钮

### Modified Capabilities

- `trail-search-pipeline`: 新增"AI 按需触发"场景，AI 搜索不再自动执行
- `smart-query-integration`: 新增"筛选条件注入搜索框"场景

## Impact

- **Mobile**: `apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx` 主要改动
- **交互变更**: 输入后只执行本地检索；AI 按钮仅在有输入时显示；下拉框选中后文字注入搜索框
