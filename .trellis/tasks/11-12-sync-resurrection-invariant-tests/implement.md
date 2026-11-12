# Implement — sync 复活防护不变量回归测试

## 测试点（已 research 确认）

- Layer 2 守卫：`SyncApplyService.ts:274` `if (local && (local.deleted === 1 || serverIsOlder)) continue;`
  - `local` 来自 `db.getAllAsync`（line 235）查询 SQLite
  - 测试手法：`mockDb.getAllAsync.mockResolvedValueOnce([{ id: 'h1', updated_at: 100, deleted: 1 }])` + server push `{ updated_at: 9999 }`
- Layer 1 守卫：`SyncApplyService.ts:255` `if (this._locallyDeleted.has(`${entity}:${id}`)) continue;`
  - 触发：`svc.registerLocalDelete('habit', 'h1')`（public，line 133）
  - timer：60s（line 142），用 `vi.useFakeTimers()` + `vi.advanceTimersByTime(60_000)`

## 现有测试模式（贴合）

L305 `skips server record when local has newer updated_at` 是 Layer 2 测试的模板——结构相同，仅：
- `deleted: 0` → `deleted: 1`
- server `updated_at: 100`（older）→ `updated_at: 9999`（newer，证明即使 server 更新也 skip）
- 断言 `result.habits` undefined + `mockDb.runAsync` not called

## 执行步骤

### Step 1 — 加 Layer 2 测试
- [ ] 在 `SyncApplyService.test.ts` 的 `describe('applyServerChanges')` 内，L305 测试后插入：
  ```ts
  it('does NOT resurrect a locally soft-deleted record even when server is newer', async () => {
    // Regression for e45e7743 — Layer 2 of resurrection chain:
    // local.deleted === 1 MUST block resurrection regardless of server updated_at.
    // See .trellis/spec/core/backend/database-guidelines.md "three-layer chain" Layer 2.
    mockDb.getAllAsync.mockResolvedValueOnce([
      { id: 'h1', updated_at: 100, deleted: 1 },
    ]);
    mockDb.runAsync.mockResolvedValue({ changes: 1 });

    const data = { habit: [{ id: 'h1', title: 'Resurrect Attempt', updated_at: 9999 }] };
    const result = await svc.applyServerChanges(data);

    expect(result.habits).toBeUndefined();
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });
  ```
- [ ] **Gate**：跑该测试通过

### Step 2 — 加 Layer 1 测试
- [ ] 在 Layer 2 测试后插入：
  ```ts
  it('skips records registered via registerLocalDelete (WriteBatcher window guard)', async () => {
    // Layer 1 of resurrection chain: _locallyDeleted bridges the sub-100ms
    // WriteBatcher window before `deleted=1` flushes to SQLite.
    // See database-guidelines.md "three-layer chain" Layer 1.
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    mockDb.runAsync.mockResolvedValue({ changes: 1 });

    svc.registerLocalDelete('habit', 'h1');

    const data = { habit: [{ id: 'h1', title: 'Incoming' }] };
    const result = await svc.applyServerChanges(data);

    expect(result.habits).toBeUndefined();
  });
  ```
- [ ] **Gate**：跑该测试通过

### Step 3 —（可选）Layer 1 timer 过期测试
- [ ] 加 `vi.useFakeTimers()` 测试：registerLocalDelete → advanceTimersByTime(60_000) → record applies
- [ ] **Gate**：通过；注意 `vi.useRealTimers()` 在 finally 或 afterEach
- [ ] 若 fake timers 与现有 mockDb 冲突，defer 此测试（标注原因）

### Step 4 — 验证
- [ ] `cd apps/mobile && pnpm run test`（或 `pnpm run test` 全量）全绿，新增 2-3 测试通过
- [ ] `pnpm run lint`（mobile）无新增 warning（ratchet 13 不破）
- [ ] 确认未改生产代码（`git diff apps/mobile/src/features/sync/SyncApplyService.ts` 应为空）

### Step 5 — 提交 + archive
- [ ] 提交：`test(sync): 补复活防护 Layer 1/2 回归测试，锁 e45e7743`
- [ ] `openspec archive sync-resurrection-invariant-tests -y`（workflow 3.4.5）
- [ ] `/trellis:finish-work`

## Validation Commands

```bash
cd apps/mobile && pnpm run test -- sync   # 跑 sync 相关测试
pnpm run lint                             # mobile ratchet 13 不破
git diff apps/mobile/src/features/sync/SyncApplyService.ts  # 应为空（不改生产代码）
```

## Rollback

- 纯加测试，删 it block 即回滚
- 若 timer 测试引入 flake，单独删除该 it block，保留 Layer 1/2 核心测试
