# 测试覆盖率提升 — 任务清单

## Phase 1: 纯函数测试
- [ ] `searchPipeline.test.ts` — runAIPhase2, runAIPhase3, mergeResults
- [ ] `useSearchHistory.test.ts` — AsyncStorage 持久化
- [ ] `useDateNavigation.test.ts` — 日期状态 + swipe 手势

## Phase 2: 写入层测试
- [ ] `WriteBatcher.test.ts` — 批量合并、flush 时机、错误恢复
- [ ] `SyncApplyService.test.ts` — patch 应用、冲突处理、schema 转换

## Phase 3: 核心编排器测试
- [ ] `SyncEngine.test.ts` — push/pull 循环、冲突合并、orphan 恢复、debounce

## Phase 4: 启动与持久化测试
- [ ] `SyncRehydrationManager.test.ts` — 数据加载、Zod 验证、部分失败恢复
- [ ] `useAppStore.test.ts` — slice 组合、跨 slice 数据访问
