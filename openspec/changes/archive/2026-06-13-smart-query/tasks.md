## 1. AI 核心函数

- [x] 1.1 在 `packages/core/src/ai/trail-recommender.ts` 新增 `parseSmartQuery` 函数，定义 `SmartQueryResult` 类型，实现 prompt 构建和 JSON 解析（含降级逻辑）
- [x] 1.2 在 `packages/core/src/ai/trail-recommender.ts` 新增 `parseSmartQuery` 导出，更新 `packages/core/src/index.ts` 导出

## 2. 前端交互 — 输入区

- [x] 2.1 在 `QuickCreateTrailScreen` 新增对话历史状态 `chatHistory: string[]` 和解析结果状态 `smartResult: SmartQueryResult | null`
- [x] 2.2 实现智能模式判断逻辑：输入 ≤2 字走本地匹配，>6 字走 AI 解析，中间范围可选
- [x] 2.3 替换现有搜索模式切换按钮为智能模式指示器（显示 "智能解析中..." loading 状态）
- [x] 2.4 添加 500ms 防抖，空输入不触发 AI 调用

## 3. 前端交互 — 追问气泡

- [x] 3.1 创建 `SmartQueryBubble` 组件：展示 AI 追问文本，解析 A./B./C. 选项为可点选按钮，支持自由输入回答
- [x] 3.2 在输入框上方渲染追问气泡，用户回答后追加到 `chatHistory` 并重新调用 `parseSmartQuery`
- [x] 3.3 实现对话轮次上限（3 轮），超过后隐藏追问直接搜索；用户修改输入框时清空历史

## 4. 前端交互 — 过滤器标签

- [x] 4.1 创建 `FilterTags` 组件：根据 `smartResult.filters` 渲染可关闭标签（📅时间 🏷标签 📈情绪）
- [x] 4.2 实现标签移除：点击关闭按钮从 filters 中移除对应条件，实时更新搜索结果
- [x] 4.3 实现手动添加：点击 "+" 按钮展开现有时间/标签/心情下拉选择器

## 5. 集成与降级

- [x] 5.1 将 `parseSmartQuery` 结果与现有 `computeCandidatePool` + `matchByKeyword`/`matchReflectionsToTopic` 流程对接：AI 返回的 filters 前置过滤 candidates，topic 传入语义匹配
- [x] 5.2 实现降级：`parseSmartQuery` 异常时 catch 并回退到本地匹配，用户无感知
- [x] 5.3 清理不再需要的 `searchMode` 状态和手动切换 UI，保留 `matchMode` 用于结果展示
