# 代码质量 — 历史页数据流修复 + 复杂度热点拆分

## Goal

修复 3 个历史页的 6 个幽灵数据 bug（`setState` + `flushWrites()` 而无 `persistChange`/`markDeleted`），并拆分 436 行单体 hook `useQuickTrailSearch`。两个子任务独立但同属代码质量收敛。

## Background

代码审查发现一个技术债务热点：3 个早期编写的历史页（FastHistoryPage / MedHistoryPage / SleepHistoryPage）在 unified-storage 重构确立 `persistChange` 契约**之前**就已存在，使用旧范式"改内存 → flush"。契约变更后未跟随迁移，导致：

- saveNote：`setState` 改了内存，但 `flushWrites()` 只刷新批处理器（此时为空），SQLite 永远没收到数据 → 重启丢失
- handleDelete：`setState({deleted:true})` 改了内存，但从未调用 `markDeleted` → 重启后记录"复活"

而 11+ 个新页面遵循 slice action 契约（预计算 → set → persistChange），0 违规。

## 子任务结构

| 子任务 | 范围 | 依赖 |
|--------|------|------|
| `08-26-history-pages-persist-fix` | 3 个 slice 补 6 个 action + 3 个历史页迁移到 slice action | 无 |
| `08-26-split-quick-trail-search` | 拆分 `useQuickTrailSearch` 436 行 hook | 无 |

两个子任务**无相互依赖**，可独立规划、实现、归档。

## 跨子任务验收标准

- [ ] `pnpm run test` 全部通过
- [ ] `pnpm run type-check` 0 错误
- [ ] 3 个历史页中 `grep -c "flushWrites\|setState" FastHistoryPage.tsx MedHistoryPage.tsx SleepHistoryPage.tsx` 对 saveNote/handleDelete 路径为 0
- [ ] `useQuickTrailSearch.ts` 拆分后主 hook ≤ 150 行
- [ ] 3 个新增 slice action 各有对应单元测试

## Out of Scope

- 其他历史页（11+ 个干净页面）不动
- `generateSuggestions`（102 行）复杂度改善 — 不紧急，不在此任务
- ESLint 超时问题 — 基础设施层面，另立
