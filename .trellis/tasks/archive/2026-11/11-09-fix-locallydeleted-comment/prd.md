# docs(sync): 修正 _locallyDeleted 重启保护链注释

## Goal

修正 `SyncApplyService` 中 `_locallyDeleted` 的误导性注释，准确描述复活防护的三层保护链和该字段的真实用途。

## Background

调查发现现有注释（line 105-109）声称"60 秒窗口在 app 重启时丢失，server delete 可能被重新 apply 回本地"是误导性的：

实际保护链（apply 路径 `applyEntityToTable`）：
1. **WriteBatcher 100ms 窗口内**（内存已删、SQLite 未写）：`_locallyDeleted` 桥接这段 —— 这才是它的真实用途。`local.deleted` 此时仍为 0。
2. **WriteBatcher flush 后**：`localMeta` 查询（line 217-218，`SELECT pk, updated_at, deleted FROM table WHERE pk IN (...)`，不过滤 deleted）取到 `deleted=1` 行 → line 256 `if (local && (local.deleted === 1 || serverIsOlder)) continue;` 接管。这是持久化的、重启后有效。
3. **recycleBin 实体**：`deletedIds`（entity-qualified 复合键，7 天，持久化）再加一层。

重启场景分析：
- 若 flush 过（≥100ms）：SQLite 有 `deleted=1`，line 256 拦截复活。✓
- 若未 flush（sub-100ms 被 kill）：删除本身没落盘，不存在"复活"——server 的存活记录反而是正确状态（属于通用写持久化取舍，非 sync bug）。

`_locallyDeleted` 60s 窗口实际是为 WriteBatcher 100ms 窗口兜底（60s 远大于 100ms，无害但偏长），跨重启无意义（重启时 SQLite 是 rehydrate 真理源）。

唯一真实残余缺口：`hardDelete`（物理 DELETE 行，仅 recycleBin 永久清理时调用）后 `local` 为 undefined，line 256 不触发。但 hardDelete 发生在永久清理时，server delete 在软删阶段（进 bin 时）已推送，风险极窄。

## Requirements

- 重写 `_locallyDeleted` 字段注释，准确描述：真实用途（桥接 WriteBatcher 100ms 窗口）、三层保护链、为何跨重启无意义。
- 不改任何代码行为。
- 注释中明确 line 256 的 `local.deleted === 1` 是持久化的重启防护。

## Acceptance Criteria

- [ ] `_locallyDeleted` 注释重写，不再声称"重启时 server delete 可能被 apply 回本地"。
- [ ] 注释准确描述三层保护链和该字段真实用途。
- [ ] 无代码行为变更（仅注释）。
- [ ] `npx vitest run apps/mobile/src/features/sync/SyncApplyService.test.ts` 全绿（回归确认）。

## Notes

- 纯文档修正，零行为风险。
- 不加 sync_queue 重建守卫（伪命题，不值得复杂度）。
