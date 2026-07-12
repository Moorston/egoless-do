# 饮食弹窗页我的tab数据持久化+PB同步

## Goal

将 AddFoodModal 中"我的" tab 的预设数据（手动添加的食品预设 `customFoodPresets`）从仅内存状态提升为完整的持久化实体，写入本地 SQLite 并同步到 PocketBase 服务端。

## Background / 调研发现

### 当前状态

- **数据模型**: `CustomFoodPreset` 类型只有 `{ id, name, calories, note? }`，缺少 `updatedAt` 和 `deleted` 字段
- **存储**: `addCustomFoodPreset()` 和 `removeCustomFoodPreset()` 仅调用 `onSettingsPersist?.()`，**未调用** `adapter.persistChange()` 或 `onSync?.()` — 数据仅存在于 Zustand 内存中，刷新即丢失
- **对比**: 其他实体（`food`, `motivationEntry`, `customWuxing` 等）均使用 `adapter.persistChange()` → 写入 SQLite + 触发 SyncEngine 同步到 PB
- **实体注册**: `entitySchemas.ts` 中无 `foodPreset` / `customFoodPreset` 实体
- **同步实体列表**: `entities.ts` 的 `SYNC_ENTITIES` 中无此实体
- **DB Schema**: SQLite 中无 `custom_food_presets` 表
- **PocketBase**: 后端无对应 collection

### AddFoodModal 中的使用方式

- `AddFoodModal.tsx` 从 store 读取 `customFoodPresets` 渲染"我的" tab 列表
- 用户可以通过手动输入界面或预设编辑界面的"保存为预设"按钮添加
- 目前 UI 层逻辑是正确的，只缺持久化落地

## Requirements

1. **扩展数据模型**: `CustomFoodPreset` 增加 `updatedAt: number` 和 `deleted: boolean` 字段，对齐其他同步实体
2. **注册为同步实体**: 新增 `foodPreset` 实体，在 `entitySchemas.ts` 添加 schema 定义
3. **添加 SQLite 表**: `apps/mobile/src/db/schema.ts` 创建 `custom_food_presets` 表
4. **注册到 SYNC_ENTITIES**: `entities.ts` 添加 `foodPreset` 到同步列表
5. **更新 Store 层**:
   - `createDietSlice.ts`: `addCustomFoodPreset()` 改用 `adapter.persistChange()` + `onSync?.()`
   - `removeCustomFoodPreset()` 改用 `adapter.markDeleted()` + `onSync?.()`
   - `StorageAdapter` 的 `SyncDataMap` 添加 `foodPreset` 映射
6. **创建 PB collection**: 后端 PocketBase 添加 `custom_food_presets` 集合
7. **添加迁移**: init 阶段为已有预设数据添加迁移（如果是纯内存数据则无需迁移）

## Acceptance Criteria

- [ ] 手动添加的食品预设关闭应用后重新打开仍然存在
- [ ] 删除预设操作持久化（软删除，同步到服务端）
- [ ] 数据通过 SyncEngine 正确同步到 PocketBase
- [ ] "我的" tab 列表在添加/删除后即时刷新
- [ ] 跨设备同步后预设数据一致

## Out of Scope

- 预设数据的编辑功能（仅添加和删除，修改现有预设暂不支持）
- 预设数据分类/排序
- 预设数据导入导出

## Open Questions (已解决)

1. **PB collection 设计**: 使用 PB hook 的 data JSON 格式（同 `food_entries` 模式）