## 1. 忽略机制重构

- [x] 1.1 在 `packages/core/src/business/trail-creation.ts` 中实现 `buildIgnoredPattern` 函数，使用感念 ID 排序后拼接的 djb2 哈希，格式 `type:hash`
- [x] 1.2 在 `packages/core/src/store/createThoughtTrailSlice.ts` 中将 `ignoredRecPatterns` 从 Zustand store 迁移到 AsyncStorage（key: `trailIgnoredPatterns`，值为 `string[]`），添加 `loadIgnoredPatterns`、`addIgnoredPattern` 方法
- [x] 1.3 修改 `packages/core/src/business/trail-creation.ts` 中的 `applyUserPreferences` 函数，将匹配忽略模式的推荐从降分改为完全移除（`filter` 而非 `map`）
- [x] 1.4 修改 `apps/mobile/src/features/reflections/TrailSuggestionBanner.tsx`，关闭按钮调用 `addIgnoredPattern` 存入 AsyncStorage，而非更新 Zustand store

## 2. 候选源过滤

- [x] 2.1 在 `apps/mobile/src/features/reflections/MindTrailScreen.tsx` 中添加 `recommendationCandidates` 的 `useMemo`，过滤条件：时间戳在最近 30 天内 且 `thoughtTrailIds` 为空数组或未定义
- [x] 2.2 将 `recommendationCandidates` 传给 `computeRecommendations` 和 `recommendTrailsViaAI`，替换原来传入的全部未删除感念
- [x] 2.3 在 `computeRecommendations` 和 `recommendTrailsViaAI` 入口处添加候选数量检查，少于 3 条时直接返回空数组

## 3. 推荐数量限制

- [x] 3.1 在 `packages/core/src/business/trail-creation.ts` 的 `computeRecommendations` 返回值末尾添加 `.slice(0, 2)`
- [x] 3.2 在 `packages/core/src/ai/trail-recommender.ts` 的 `recommendTrailsViaAI` 返回值末尾添加 `.slice(0, 2)`
- [x] 3.3 在 `apps/mobile/src/features/reflections/MindTrailScreen.tsx` 中，将本地和 AI 推荐的简单拼接替换为调用 `mergeAndRank` 函数，结果 `.slice(0, 2)`

## 4. 集成与验证

- [x] 4.1 在 `apps/mobile/src/features/reflections/MindTrailScreen.tsx` 中加载 AsyncStorage 中的忽略记录，传给 `applyUserPreferences`
- [ ] 4.2 端到端测试：关闭推荐后重启 app 验证不再出现、不同感念集合的同类型推荐正常展示、候选不足 3 条时不推荐
