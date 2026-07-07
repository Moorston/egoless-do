# 测试覆盖率提升 — 任务清单

> 评估日期: 2026-07-07 | 总评估工时: 62-76h | 建议执行: 批次 A+B (15-18h)

## 🟢 批次 A: 纯函数 + 写入层补缺 (7-9h)

- [ ] `WriteBatcher.test.ts` 补缺口 — fallback/retry 路径、定时器 flush、快照合并安全 (3-4h, 8-10 用例)
- [ ] `searchPipeline.test.ts` — runAIPhase2 + runAIPhase3 全分支覆盖 (4-5h, 12-16 用例)
- [ ] `useDateNavigation.test.ts` 升级 — renderHook + 未来日期守卫 (1.5-2h, 5-6 用例)
- [ ] `useSearchHistory.test.ts` 升级 — renderHook 接线测试 (2h, 4-5 用例)

## 🟢 批次 B: 启动层测试 (8.5-9h)

- [ ] `SyncRehydrationManager.test.ts` — 分页+重试+指数退避+并行拉取 (5h, 35 用例)
- [ ] 共享 mock 工具 — `__tests__/helpers/syncMocks.ts` 提取 (3.5-4h)

## 🟡 批次 C: 有条件执行（需重构前置）

- [ ] `SyncApplyService.test.ts` — patch 应用、冲突处理、cascade delete (8-10h, 22-25 用例)
  - 前置: 搭建 16 rowMapper mock 基础设施
- [ ] `SyncEngine.test.ts` — push/pull 循环、冲突合并、orphan 恢复、debounce (26h, 20-25 用例)
  - 前置: 依赖注入重构（constructor(deps) 替代内联 new, ~4-6h）
- [ ] `useAppStore.test.ts` — slice 组合、跨 slice 数据访问 (13h, 45+ 用例)
  - 前置: 提取 `initMobileStore()` 消除模块级副作用 (~3-4h)
