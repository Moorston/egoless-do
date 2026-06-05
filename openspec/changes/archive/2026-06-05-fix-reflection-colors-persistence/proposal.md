## Why

感念卡片的渐变背景色（`colors` 字段）在 APP 重启或清除数据后丢失。根本原因是同步链路（SyncService）在构建 push payload 时遗漏了 `colors` 字段，且 pull 时 `INSERT OR REPLACE` 未包含该列导致本地颜色被覆盖为 NULL。随后的保留逻辑虽然尝试恢复，但将 JSON 字符串直接赋给 store，UI 层按数组索引取值时得到的是单个字符而非颜色值，导致渐变色失效。

## What Changes

- **Mobile SyncService**：`reflectionToSync()` 加入 `colors` 字段，使服务器能正确存储渐变色
- **Mobile SyncService**：`INSERT OR REPLACE` 语句加入 `colors` 列，避免 pull 时覆盖本地数据
- **Mobile SyncService**：保留逻辑中对 JSON 字符串做 `JSON.parse` 后再合并到 store patch
- **Web SyncService**：同步修复上述问题（web 端存在相同 bug）
- **UI 防御性修复**：`ReflectionCard`、`ReflectionsScreen`、`ShareCard` 对 `typeof colors === 'string'` 做兼容解析
- **`useSync.ts`**：合并逻辑增加字符串类型的 colors 检测

## Capabilities

### New Capabilities
- `reflection-colors-sync`: 感念卡片渐变色的完整同步支持，包括 push/pull 双向传输、本地持久化、UI 防御性渲染

### Modified Capabilities

（无已有 spec 需修改）

## Impact

- **平台**：Mobile + Web 双端
- **文件**：
  - `apps/mobile/src/features/sync/SyncService.ts` — 核心修复
  - `apps/mobile/src/features/sync/useSync.ts` — 合并逻辑修复
  - `apps/mobile/src/features/reflections/ReflectionCard.tsx` — UI 防御
  - `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` — UI 防御
  - `apps/mobile/src/features/reflections/ShareCard.tsx` — UI 防御
  - `apps/web/src/db/syncService.ts` — Web 端同步修复
  - `apps/web/src/store/useWebStore.ts` — Web 端合并逻辑
- **数据兼容**：已有损坏数据（colors 为字符串）需在 UI 层兼容修复，无需数据迁移
- **非目标**：不涉及新增颜色选择器功能、不改变颜色持久化存储结构
