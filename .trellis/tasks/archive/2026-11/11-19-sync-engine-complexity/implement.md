# Implement — SyncEngine 复杂度拆分

> 每 Phase 末尾的门禁（全部通过才进下一 Phase）：
> ```bash
> pnpm exec vitest run                       # 全量（根目录 workspace；mobile symlink 双份计数属正常）
> pnpm run type-check                        # 0 error
> pnpm exec eslint "apps/mobile/src/features/sync/**/*.ts" --max-warnings 0
> pnpm exec eslint "apps/mobile/src/features/sync/SyncEngine.ts" --rule '{"complexity": ["warn", 15]}'
> ```
> 回滚点：每 Phase 一个 commit，门禁红 → revert 该 commit。

## Phase 0 — 基线快照

- [x] 0.1 全量测试绿基线（2083/2083）
- [x] 0.2 complexity 实测快照：executePush 54 / executePull 41 / runSync 27（2026-11-19 实测确认）

## Phase A — characterization 补测（拆分前锁现状）

- [x] A1 markRetry fallback：`mockMarkQueueItemRetry.mockRejectedValue` → `markQueueItemFailed(1, 'Retry mark failed')` 兜底 ✓
- [x] A2 local.deleted skip：`getFirstAsync { deleted: 1 }` → `markQueueItemConflict(1, 'Locally deleted')` + 无 UPDATE ✓（首版断言 `runAsync not called` 假——cleanup 的 purge 也走 runAsync，改为精确断言无 `UPDATE habits`）
- [x] A3 no-serverData max-retries：retry_count=4 → `markQueueItemFailed`；=0 → `markQueueItemConflict` ✓
- [x] A4 wasLargePush 保障路径：21 items 干净 push → post-push pull 跳过 + 保障块 check+full pull ✓（**characterization 发现**：保障块确实无 per-entity timestamps——测试初版注释写反被红测纠正，design 差异表第 4 项实证）
- [x] A5 门禁全绿 + 新测试 0 lint warning（44/44）

## Phase B — PushConflictResolver 拆分（R1）

- [x] B1 新建 `PushConflictResolver.ts`：resolveRejected / resolveOne / resolveServerDeleted / resolveServerWins / reportUnresolvable / reportNoServerData，move-only 自 executePush 377-466
- [x] B2 SyncEngine 接线：`SyncEngineDeps.conflictResolver?` + 默认构造（经引擎 `_openDatabase`/`_withDbLock`/`_mark*` 注入辅助路由）+ executePush 内一行调用；`removeQueueItems` 留在引擎（事务边界）
- [x] B3 `PushConflictResolver.test.ts` 10 用例：UPDATE / INSERT fallback / server-deleted / locally-deleted skip（getFirstCalls 手工记录）/ invalid serverData → UI / unknown entity / resolve-error fallback / no-serverData 三分支
- [x] B4 **设计修正**：不加 `vi.mock('./PushConflictResolver')`——默认构造经引擎注入辅助路由（测试已全部 mock），引擎层测试直接跑真 resolver（集成路径，覆盖更强），A1-A4 + 既有用例零改动全绿
- [x] B5 门禁全绿；executePush 54→37；resolver 各方法 ≤15（复杂度检查 clean）

## Phase C — ensureSyncToken 拆分（R2）

- [x] C1 抽 `ensureSyncToken(initialToken)` + `SyncTokenState` 判别联合（`{giveUp, clearTrigger}` 保留 recovery 无果 vs throw 的 clearSyncTrigger 差异）；Token recovery 5 用例零改动全绿
- [x] C2 二次微拆：orphan-recovery 块 → `recoverOrphansIfDue()`（runSync 27→17→…）；error 收尾 → `handleSyncError()`（完整语义单元，非压数字）
- [x] C3 门禁全绿；runSync 退出超标列表（≤15）
- [x] **C 回归修复（测试护航价值实证）**：首版 `await this.ensureSyncToken()` 在快路径引入 await 边界 → 让出微任务 → 并发 `runSync` 第二调用穿过 `_syncing` 去重窗口——被 `SyncService.test > skips when already syncing` 抓住（drainQueue 2 次 ≠ 1 次）。修复：快路径（token 存在且非近过期）同步直达 `_syncing = true`（`isTokenNearExpiry()` 同步判断 + `?? undefined` 归一 null），仅慢路径 await

## Phase D — executePull 同构合并（R3）

- [x] D1 抽 `pullOnce(opts, ...)`：4 项差异显式参数化（entities scope / onCheckError: 'pull-anyway'|'skip' / updatePerEntityTimestamps / 日志 phase）
- [x] D2 executePull 本体两次调用；kicked-out 短路保持在 pullOnce 各阶段内
- [x] D3 再抽 `applyPulledData()`（apply + ghost guard）+ `setPerEntitySyncTimestamps()`（pullOnce 骨架 23→≤15，阶段边界语义单元）
- [x] D4 现有 executePull 3 用例 + kicked-out 2 用例 + A4 保障块用例全绿，零改动
- [x] **明确记录的偏离**：保障块错误日志从笼统 `warn('large-push check')` 精确为分阶段 `error('pull')`/`error('applyServerChanges')`——控制流与测试断言零变更，仅日志定位更精确（design 原则是"日志零变更"，此处偏离已显式记录在 pullOnce docstring）
- [x] D5 门禁全绿；executePull 41→≤15 退出超标列表

## Phase E — risk-tier 豁免记录 + 全量验收（R4）

- [x] E1 `.trellis/spec/mobile/frontend/quality-guidelines.md` 新增 "Risk-Tiered Complexity Exemption（≤40）"：适用三条件（单一安全职责 + 测试护航 + 可拆单元已拆尽）+ 豁免清单（executePush 37，含 54→37 拆分记录与护航测试）+ 与"禁止 eslint-disable carve-out"条款关系（豁免是文档化重验证，不是禁用规则）
- [x] E2 显式复测：SyncEngine.ts 超标仅剩 executePush 37（豁免清单内）；PushConflictResolver.ts 全部 ≤15。**域内其他文件超标（out of scope，后续任务候选）**：SyncApplyService.applyEntityToTable 37 / SyncRehydrationManager.rehydrateFromDb 30 / mergeSyncPatch 26 / SyncRealtimeController._handleEvent 18
- [x] E3 终验：全量 2097/2097 绿（基线 2083 + 14 新增）/ type-check 0 error / lint ratchet 0 / AC 1-8 逐条达标（AC1 预估 ≤36 修正为实测 37，≤40 豁免线内）

## Phase F — 收尾（workflow Phase 3）

- [x] F1 spec update（trellis-update-spec：pullOnce 差异参数化契约 + fast-path 同步性约束沉淀）——quality-guidelines.md 两个新小节，check agent 复核确认
- [x] F2 分批 commit：① test（A 组 characterization）② refactor（B/C/D 一次，同文件交织）③ docs（E + 任务文件）——0d538be9 / 6fa9cbfb / 5a615f2d；.trellis/tasks/ 留给 archive auto-commit
- [x] F3 `openspec archive sync-engine-complexity --yes`——archived as 2026-11-20-sync-engine-complexity（proposal-only，无 delta warning 预期）
- [ ] F4 task archive + journal（finish-work）

## 已知坑（执行期实测补充）

- packages/core 的 vitest bin 链接损坏——全量测试用根目录 `pnpm exec vitest run`（2026-11-19 已知，复现）
- `vi.fn` 包装泛型函数会**擦除类型参数**（`<T,>(...) => Promise<T|null>` 退化为 `Promise<unknown>`）——泛型 mock 用普通泛型函数 + 手工调用记录数组
- vi.mock 模块的 import 排序：`@egoless-do/core` type import 必须在 `vitest` import 之前（import/order 报错且 --fix 不能完全自动修跨 mock 块的排序）
- ESLint `max-depth` disable 注释（SyncEngine.ts 头部）对抽出文件不适用——resolver 文件原生通过，无需 disable。对 SyncEngine 本身仍需要：临时移除后 3 处 warning（line 369/374/418）全部位于 executePush（豁免函数）内的 retry ladder 与 post-push pull 嵌套，状态机固有密度，保留文件级 disable（2026-11-20 验证）
- executePull 的 `token` 参数从未使用（原代码遗留）——签名保持不变（调用方零改动原则）
