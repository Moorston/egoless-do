## Context

快速创建脉络页（QuickCreateTrailScreen）当前有两种搜索模式：本地关键词匹配（`matchByKeyword`）和 AI 语义匹配（`matchReflectionsToTopic`）。用户必须自己将想法翻译成关键词，无法用自然语言描述复杂的查询意图。

现有 AI 基础设施已完备：`AIService` 支持云端调用、`trail-recommender.ts` 已有 prompt 模式和 JSON 解析逻辑。本变更在此基础上新增一个更智能的查询解析层。

## Goals / Non-Goals

**Goals:**
- 用户输入自然语言，AI 自动提取时间/标签/情绪/关键词等过滤维度
- AI 能识别三种意图：过滤型、分析型、探索型
- AI 在信息不足时主动追问，用户可多轮对话
- 解析结果可视化，用户可手动调整

**Non-Goals:**
- 不改动现有 `matchReflectionsToTopic` 和 `recommendTrailsViaAI`
- 不做语音输入
- 不做跨页面搜索（仅限 QuickCreateTrailScreen）
- 不做流式响应（单次 JSON 返回）

## Decisions

### D1: 新增独立函数 `parseSmartQuery` 而非修改 `matchReflectionsToTopic`

**理由**: `matchReflectionsToTopic` 只做语义匹配返回索引，职责单一。新函数需要返回结构化的过滤器和意图，是不同的关注点。保持现有函数不变，避免影响推荐功能。

**替代方案**: 在 `matchReflectionsToTopic` 内部分支处理 — 拒绝，因为会让函数过于复杂。

### D2: 单次 AI 调用返回完整结构，不做分步调用

**理由**: 延迟是移动端关键体验。一次调用返回 `{ filters, intent, question, topic }` 比"先解析意图 → 再匹配"快一倍。prompt 足够表达这个复合任务。

**替代方案**: 分两步（先解析再匹配） — 拒绝，两次网络请求延迟翻倍。

### D3: 对话历史以字符串数组传递，不引入状态管理

**理由**: 对话轮次通常 2-3 轮，历史量小。在组件内用 `useState<string[]>` 管理即可，无需 Zustand slice。每次调用时将历史拼接进 prompt。

**替代方案**: 新增 ConversationSlice — 过度设计，对话是页面级临时状态。

### D4: 追问以气泡 UI 展示，支持点选 + 自由输入

**理由**: 追问是引导性的，给用户选项能降低认知负担。同时保留自由输入以应对 AI 选项不覆盖的情况。

**AI 返回格式**: `question` 字段为字符串时直接展示；为 `null` 时不追问。选项内嵌在 question 文本中（如 "你说的缓解是指：A.心情变好 B.事情有进展"），前端解析 A./B. 前缀提取选项。

### D5: 降级策略 — AI 不可用时回退到现有本地模式

**理由**: 不是所有用户都配置了 AI。`parseSmartQuery` 检测到无云端配置时，返回 `{ intent: 'filter', filters: {}, question: null, topic: input }`，等同于现有行为。前端根据返回值决定走 AI 匹配还是本地匹配。

## Risks / Trade-offs

- **[延迟]** AI 解析可能需要 2-5 秒 → 用 loading 动画 + 感知优化（先显示解析中提示）
- **[解析失败]** AI 返回非预期 JSON → try-catch 降级为直接语义匹配
- **[追问循环]** AI 可能反复追问 → 限制最大对话轮次为 3，超过后强制用当前解析结果搜索
- **[成本]** 每次输入都触发 AI 调用 → 加 500ms 防抖，空输入不调用
