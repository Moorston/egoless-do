# SyncEngine 复杂度拆分：安全语义边界 + 测试护航

## Goal

`apps/mobile/src/features/sync/SyncEngine.ts`（916 行）三个超标方法沿**安全语义边界**拆分，零行为变更：

| 方法 | 现状 complexity | 目标 |
|------|----------------|------|
| `executePush` | 54 | ≤36（剩余进 risk-tier ≤40 豁免） |
| `executePull` | 41 | ≤15 |
| `runSync` | 27 | ≤15 |

判断修正（相对早期探索）：sync 域**非零测试**——`SyncEngine.test.ts` 896 行 40 用例 + `SyncApplyService.test.ts` resurrection invariant 护航。策略是**测试护航拆分**（characterization 先行），不是无测试保守拆分。

## Background

- quality-guidelines 团队约定 complexity ≤15，但规则默认不启用从未被检查——显式 `--rule` 实测 mobile 61 个超标函数中 SyncEngine 占 3 个（54/41/27）。
- 同步引擎是数据安全核心：冲突解决含「不复活本地删除」invariant、SQL 注入校验（isValidSqlName）、server-wins 策略、kicked-out 401 处理。复杂度来源是**错误处理状态机的固有分支密度**，不是坏味道——拆分必须沿语义边界，不能为压数字打散安全逻辑。
- 详见 `openspec/changes/sync-engine-complexity/proposal.md`（任务来源）。

## Requirements

1. **R1 PushConflictResolver 抽出**：executePush 的 auto-resolve 块（379-466，~88 行）独立为可单测的 resolver——收益最大（冲突解决含 resurrection invariant + SQL 校验，最值得独立测试）。
2. **R2 ensureSyncToken 抽出**：runSync 的 token 生命周期块（634-682）——近过期主动刷新 + 无 token 恢复 + 不早登出保护。
3. **R3 executePull 同构合并**：主 pull 块（524-585）与 wasLargePush 保障块（588-603）共享 check→pull→apply→generation-guard 骨架，行为差异显式参数化。
4. **R4 risk-tier 豁免制度化**：剩余超标（预计 executePush ~36）按 risk-tier ≤40 记录进 `mobile/frontend/quality-guidelines.md`，理由是错误处理状态机固有密度。
5. **R5 拆分暴露的未测分支先补测再拆**：markRetry fallback 原子性保护、local.deleted skipReason、no-serverData max-retries 分支、wasLargePush 保障路径。

## Constraints

- **零行为变更**：这是纯重构任务，不改任何同步语义（含日志内容、错误处理顺序、SQL 语句）。
- mobile lint ratchet = 0：新代码（含测试）不得引入任何新 warning。
- 不动 `SyncApplyService` / `SyncTimestampManager` 等既有服务边界（本轮只拆 SyncEngine 自身）。
- Out of scope：`migrateAsyncStorageToSQLite`(32)、强压全仓 ≤15、依赖注入体系重构。

## Acceptance Criteria

- [ ] AC1 `executePush` complexity ≤40（design 预估 ~36，实测 37），剩余超标按 risk-tier ≤40 豁免并记录在 quality-guidelines.md（含豁免理由与函数清单）
- [ ] AC2 `executePull` complexity ≤15（拆出 helper 各自 ≤15）
- [ ] AC3 `runSync` complexity ≤15
- [ ] AC4 新增 PushConflictResolver 有独立 co-located 测试，覆盖 server-wins / server-deleted / locally-deleted skip / invalid serverData / no-serverData max-retries 全部分支
- [ ] AC5 拆分前补齐 characterization 测试：markRetry fallback（markRetry 失败 → markFailed 兜底）、local.deleted skip、wasLargePush 保障路径——拆分前红绿基线锁定
- [ ] AC6 全量测试绿（`pnpm exec vitest run`，含 SyncEngine.test.ts 40 用例 + SyncApplyService resurrection invariant 全绿）
- [ ] AC7 `pnpm run type-check` 0 error；`pnpm run lint` exit 0（mobile ratchet 0 不变）
- [ ] AC8 显式 complexity 检查（`--rule '{"complexity": ["warn", 15]}'`）SyncEngine.ts 超标函数仅剩 risk-tier 豁免清单内的条目
