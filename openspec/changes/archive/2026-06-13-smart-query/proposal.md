## Why

快速创建脉络页的搜索输入要求用户自己把想法翻译成关键词或短语。用户输入自然语言（如"上个月工作压力大但有所缓解的感念"）时，系统无法理解时间、标签、情绪等过滤维度，也无法处理抽象意图（如"我最近是不是在进步"）。需要一个 AI 智能查询层，让用户用自然语言就能找到想追踪的感念。

## What Changes

### 1. 新增 `parseSmartQuery` AI 函数
- 接收用户自然语言输入 + 感念摘要列表 + 对话历史
- 一次性返回：解析出的过滤器（时间/标签/情绪/关键词）、意图类型、追问（如需）、语义匹配主题
- 意图类型：`filter`（过滤型）、`analyze`（分析型）、`explore`（探索型）

### 2. 对话式多轮交互
- AI 返回追问时，以气泡形式展示在输入框上方
- 用户可点选选项或自由输入回答
- 对话历史累积传入下一次 AI 调用，实现上下文连贯

### 3. 解析结果可视化
- 解析出的过滤器以可编辑标签显示（📅时间 🏷标签 📈情绪）
- 用户可点击标签手动调整或移除

### 4. QuickCreateTrailScreen 交互升级
- 输入框底部的本地/AI模式切换改为智能模式（自动判断）
- AI 追问气泡替代原有的手动过滤器下拉（保留作为降级方案）
- 搜索结果展示逻辑不变，复用现有 ReflectionCheckItem

## Capabilities

### New Capabilities
- `smart-query`: AI 自然语言查询解析 — 意图识别、过滤器提取、多轮对话、追问机制

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- **平台**: Mobile（QuickCreateTrailScreen）
- **代码**: `packages/core/src/ai/trail-recommender.ts`（新增函数）、`apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx`（交互升级）
- **依赖**: 现有 AI 基础设施（AIService + OpenAI-compatible provider），无需新增外部依赖
- **非目标**: 不改动现有 `matchReflectionsToTopic` 和 `recommendTrailsViaAI`；不做语音输入；不做跨页面智能搜索
