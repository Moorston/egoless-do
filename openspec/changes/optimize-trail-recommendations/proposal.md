## Why

思维脉络的推荐系统存在三个问题：推荐源没有过滤（已分配的感念也会被推荐）、推荐数量无上限、用户忽略的推荐只是降分而非移除。导致推荐结果重复、不可操作、用户不感兴趣的内容反复出现。

## What Changes

- **候选源过滤**：只将最近 30 天内、未分配到任何思维链的感念作为推荐源。候选不足 3 条时不推荐。
- **推荐数量限制**：本地推荐最多 2 条，AI 推荐最多 2 条，合并后最多 2 条。
- **忽略机制重构**：用户点 X 关闭推荐后，用感念 ID 集合的哈希作为 key 存入 AsyncStorage，下次推荐时完全移除（不是降分）。不跨设备同步。
- **合并策略**：使用已有的 `mergeAndRank` 函数（>50% 重叠去重），替换当前的简单拼接。

## Capabilities

### New Capabilities

- `recommendation-filtering`: 推荐候选源过滤（30天 + 未分配）和数量限制（max 2）
- `recommendation-dismiss`: 推荐忽略机制重构（哈希匹配 + 完全移除 + AsyncStorage 本地存储）

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **平台**: 仅 mobile
- **核心文件**:
  - `packages/core/src/business/trail-creation.ts` — `computeRecommendations`、`applyUserPreferences`、`buildIgnoredPattern`
  - `apps/mobile/src/features/reflections/MindTrailScreen.tsx` — 推荐加载流程
  - `apps/mobile/src/features/reflections/TrailSuggestionBanner.tsx` — Banner 忽略逻辑
  - `packages/core/src/store/createThoughtTrailSlice.ts` — `ignoredRecPatterns` 状态
- **非目标**:
  - 不新增本地检测器（如关键词聚类、连续记录等）
  - 不优化 AI 推荐的 RAG 策略（已在前一个 change 中完成）
  - 不改变推荐卡片的 UI 样式
