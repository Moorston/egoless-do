# sync 复活防护不变量回归测试

## Goal

补全复活防护三层链中缺失的 2 层回归测试，锁住 sync 子系统最危险的不变量。关联 proposal：`openspec/changes/sync-resurrection-invariant-tests/proposal.md`。

## Background

本次 explore 发现 `SyncApplyService.applyEntityToTable` 的复活防护三层链测试覆盖严重不均：

| Layer | 守卫代码 | 测试 |
|-------|---------|------|
| 1 — WriteBatcher 窗口 | line 255 `this._locallyDeleted.has(...)` | ❌ 无 |
| 2 — post-flush (restart-safe) | line 274 `local.deleted === 1` | ❌ 无（e45e7743 修复，最危险）|
| 3 — recycleBin deletedIds | line 254 `deletedIds?.has(...)` | ✅ L381/L395 |

现有 `SyncApplyService.test.ts:305` 测的是 `deleted: 0` + server older（正常冲突）。`deleted: 1` + server newer（复活场景）零覆盖。若有人重构把 line 274 的 `local.deleted === 1 ||` 简化掉，无测试失败，软删除记录静默复活。

## Requirements

### R1 — Layer 2 回归测试（高优先）
- 测试：local 行 `deleted: 1` + server push `updated_at` 更新 → `applyServerChanges` skip（不写、不复活）
- 锁住 e45e7743 的核心条件 `local.deleted === 1`，即使 serverIsOlder 为 false 也必须 skip
- 注释标注 spec 不变量条目（链回 database-guidelines.md 三层链 Layer 2）

### R2 — Layer 1 回归测试
- 测试：`svc.registerLocalDelete('habit', 'h1')` 后，窗口期内 `applyServerChanges` skip 该记录
- 可选：60s timer 过期后放行（用 `vi.useFakeTimers`）
- 注释标注 Layer 1（WriteBatcher 窗口桥接）

## Acceptance Criteria

- [ ] Layer 2 测试存在：`deleted:1` + server newer → `result.habits` undefined，且 `mockDb.runAsync` 未对该记录调用
- [ ] Layer 1 测试存在：`registerLocalDelete` 后窗口期 skip
- [ ] (可选) Layer 1 timer 过期测试：60s 后放行
- [ ] 测试注释含 spec 不变量引用（database-guidelines.md 三层链）
- [ ] `pnpm run test`（apps/mobile）全绿，新增测试通过
- [ ] 不改任何生产代码（纯加测试）
- [ ] OpenSpec change `sync-resurrection-invariant-tests` archive（按 workflow 3.4.5）

## Out of Scope

- Layer 3（已有测试，不重复）
- `_locallyDeleted` 60s timer 精确时序（fake timers 验证过期即可）
- sync push/pull 协议其他环节
- 生产代码任何改动

## Risks

- **极低**：纯加测试。唯一注意点：Layer 1 测试调 `registerLocalDelete`（public API，line 133），无需访问 private `_locallyDeleted`
