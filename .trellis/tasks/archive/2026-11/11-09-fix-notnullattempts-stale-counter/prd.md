# fix(store): 清理 _notNullAttempts 残留计数器，防止过早 giveup 丢数据

## Goal

修复 `WriteBatcher._notNullAttempts` 计数器在记录最终成功 flush 后未被清理的 bug，避免同一 `${entity}:${id}` 后续再次 NOT NULL 失败时过早命中 giveup 阈值被静默丢弃。

## Background

`_flush` 的 NOT NULL 重试机制（line 178-208）：
- NOT NULL 失败 → `decideNotNullRetry(prev)` 决策（report/keep/giveup），`_notNullAttempts.set(key, next)`，`notNullKeys.add(key)` 保留待重试。
- 仅在 'giveup' 时 `_notNullAttempts.delete(key)`（line 203）。

成功路径（line 219-223）从 `_pendingWrites` 删除已 flush 的 entry，但**未清理 `_notNullAttempts[key]`**。

**Bug 场景**：
1. 记录 X NOT NULL 失败 → `_notNullAttempts[X] = 1`，保留待重试。
2. 后续 write 合入了缺失列 → X flush 成功 → `_pendingWrites.delete(X)`，但 `_notNullAttempts[X] = 1` 残留。
3. X 后来再次 NOT NULL 失败 → `decideNotNullRetry(prev=1)` → `nextAttempts=2`...继续残留累积。
4. X 的 NOT NULL 失败次数从真实 0 起算却带着历史残留 → 过早命中 `nextAttempts >= NOT_NULL_MAX_ATTEMPTS(10)` → 'giveup' → **X 被丢弃，少于真正的 max 次数**。

## Requirements

- 在成功移除循环（`_flush` line 219-223）里，删除被移除 entry 对应的 `_notNullAttempts` 条目。
- 不改变 NOT NULL 失败路径的现有逻辑（report/keep/giveup）。
- 不改变 'giveup' 时的 `_notNullAttempts.delete(key)`（line 203）。

## Acceptance Criteria

- [ ] `_flush` 成功移除 entry 时同步清理 `_notNullAttempts[key]`。
- [ ] **新增测试**：记录 NOT NULL 失败后成功 flush → `_notNullAttempts` 不再残留该 key；同一 key 后续 NOT NULL 失败从 0 起算（不因残留而过早 giveup）。
- [ ] 现有 `WriteBatcher.test.ts` + `flushPolicy.test.ts` 全绿。
- [ ] `npx vitest run apps/mobile/src/store/WriteBatcher.test.ts apps/mobile/src/store/flushPolicy.test.ts` 全绿。

## Notes

- 一行核心修复 + 一个回归测试。
- 与本会话 sync 模块修复风格一致：纯函数/数据安全 + 回归测试。
