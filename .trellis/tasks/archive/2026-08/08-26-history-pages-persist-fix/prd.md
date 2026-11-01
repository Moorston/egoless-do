# 历史页数据流契约迁移 — persistChange 修复 6 个幽灵数据 bug

## Goal

将 3 个历史页（FastHistoryPage / MedHistoryPage / SleepHistoryPage）的 saveNote 和 handleDelete 从违规的 `setState` + `flushWrites()` 模式迁移到 slice action 范式（预计算 → set → persistChange/markDeleted），消除 6 个幽灵数据 bug。

## Background — 根因

### Bug 实例清单（代码审查确认）

| # | 文件:行 | 操作 | 当前违规代码 | 后果 |
|---|---------|------|-------------|------|
| 1 | `FastHistoryPage.tsx:198-202` | saveNote | `setState({fastingHistory:newHist})` + `flushWrites()` | 编辑的 note 重启丢失 |
| 2 | `FastHistoryPage.tsx:301-304` | handleDelete | `setState({fastingHistory:newHist})` + `flushWrites()` | 软删除未持久化，重启"复活" |
| 3 | `MedHistoryPage.tsx:205-210` | saveNote | `setState({medHistory:newHist, totalMedMinutes:newTotal})` + `flushWrites()` | 同 #1 |
| 4 | `MedHistoryPage.tsx:315-319` | handleDelete | 同 #2 模式 + 重算 totalMedMinutes | 同 #2 |
| 5 | `SleepHistoryPage.tsx:198-202` | saveNote | `setState({sleepHistory:newHist})` + `void flushWrites()` | 同 #1 |
| 6 | `SleepHistoryPage.tsx:392-396` | handleDelete | 同 #2 模式 | 同 #2 |

### 为什么会违规 — 范式分裂

这 3 个页面写于项目早期，早于 unified-storage 重构确立 `persistChange` 契约。误解了 `flushWrites()` 的语义：开发人员以为它会持久化当前 Store 状态，但它只刷新批处理器（此时为空，因为没有调用 `persistChange`）。

### Slice action 覆盖缺口

| Slice | 已有 action | 缺口（历史页需要但 slice 没有） |
|-------|-------------|------|
| `createFastingSlice` | startFasting, stopFasting | `updateFastingNote(id, note)`, `deleteFastingEntry(id)` |
| `createMeditationSlice` | addMedMinutes, calculateTotalMedMin | `updateMeditationNote(id, note)`, `deleteMeditationEntry(id)` |
| `createSleepSlice` | completeBarrier, saveSleepDiary(today-only), setSleepGoal | `updateSleepNote(id, note)`, `deleteSleepEntry(id)` |

## 确认事实

- `createPlanSlice.toggleCheckin` 是正确范式模板：预计算 → `set(() => patch)` → `adapter.persistChange('planItemCheckin', id, data).catch(e => log.error(e))`
- `mobileStorageAdapter.markDeleted(entity, id)` 是软删除的正确入口：注册本地删除 + `_batcher.markDeleted(entity, id)` 写入 `{deleted:true}`
- `adapter.persistChange` 返回的 Promise 立即 resolve（写入是 100ms 防抖批处理），UI 无需 await
- MedHistoryPage 的 handleDelete 需要重算 `totalMedMinutes`（聚合值），slice action 必须处理这个副作用
- SleepHistoryPage 的 `saveSleepDiary` 只处理"今天"的条目（`dateStr()`），不能复用——必须新增 `updateSleepNote(id, note)` 处理任意历史日期
- 3 个历史页当前 0 个 `persistChange` 调用、0 个测试覆盖

## Requirements

### R1: 补齐 slice action（core 层）

为 3 个 slice 新增 6 个 action，遵循 `createPlanSlice.toggleCheckin` 范式：

- `createFastingSlice`: `updateFastingNote(id, note)`, `deleteFastingEntry(id)`
- `createMeditationSlice`: `updateMeditationNote(id, note)`, `deleteMeditationEntry(id)`（含 `totalMedMinutes` 重算）
- `createSleepSlice`: `updateSleepNote(id, note)`, `deleteSleepEntry(id)`

每个 action：
1. 预计算新状态（纯逻辑）
2. `set(() => patch)` 更新 Store（无副作用）
3. `adapter.persistChange(entity, id, data).catch(e => log.error(e))` 或 `adapter.markDeleted(entity, id).catch(e => log.error(e))`
4. 重算聚合值（meditation 需要，其他按需）

### R2: 迁移历史页调用点（mobile 层）

3 个历史页的 saveNote/handleDelete 改为调用新 slice action，移除 `setState` + `flushWrites()` + 动态 import + `console.error`。

### R3: 错误处理规范化

移除 3 个历史页的 `console.error('...', err)`，改用 `createLogger`（slice action 内部已用 `createLogger`，UI 层不再需要 catch）。

### R4: 测试覆盖

为 6 个新 slice action 各补一个单元测试（对标 `createFastingSlice.test.ts` 已有模式）。

## Acceptance Criteria

- [x] AC1: `grep -rn "flushWrites\|console.error" apps/mobile/src/features/{fasting,meditation,sleep}/*HistoryPage.tsx` 对 saveNote/handleDelete 路径返回 0 匹配
- [x] AC2: 3 个历史页的 saveNote/handleDelete 通过 slice action 调用，不直接 `setState`
- [x] AC3: 6 个新 slice action 各有单元测试，验证 set + persistChange/markDeleted 配对（fasting 5 个 + meditation 6 个 + sleep 5 个 = 16 个新测试）
- [x] AC4: type-check 零新增错误（注：mobile 无 type-check 脚本，用 `tsc --noEmit` 验证；基线 6 个既有错误，改动后仍 6 个）
- [x] AC5: `vitest run packages/core/src/store/` 全部通过（19 文件 161 测试）
- [x] AC6: ESLint 对修改的文件 0 新增 warning（trellis-check 验证通过）

## Technical Notes

- Entity 名称：`'fasting'`, `'meditation'`, `'sleep'`（与现有 persistChange 调用一致）
- `markDeleted` 会写入 `{deleted:true, updatedAt:now}`，UI 层的 `activeOnly` / `!deleted` 过滤会自动隐藏
- MedHistoryEntry 的 id 是 `date`（见 `addMedMinutes` 第 34 行 `entry.date`），不是 uuid——persistChange 用 `entry.date` 作 id

## Out of Scope

- `useQuickTrailSearch` 拆分（见兄弟任务 `08-26-split-quick-trail-search`）
- 其他 11+ 个干净历史页不动
