# 饮食弹窗页我的tab数据持久化+PB同步 — 设计文档

## 架构

```
用户操作 AddFoodModal
  → store.addCustomFoodPreset() / removeCustomFoodPreset()
    → adapter.persistChange('foodPreset', ...)   // 写入 SQLite
    → onSync?.()                                  // 触发 SyncEngine
      → SyncEngine.pushToServer()                 // 同步到 PocketBase
```

## 新增/修改的文件

### 1. 数据模型 — `packages/core/src/types/food.ts`
- 扩展 `CustomFoodPreset` 接口，增加 `updatedAt: number` 和 `deleted: boolean`

### 2. 实体 Schema — `packages/core/src/sync/entitySchemas.ts`
- 新增 `foodPreset` 实体 schema：
  - SQLite 表: `custom_food_presets`, pk: `id`
  - PB collection: `custom_food_presets`, serverIdField: `preset_id`
  - 字段: `id`, `name`, `calories`, `note`, `updatedAt`, `deleted`
  - 使用 PB hook data JSON 格式（同 `food_entries` 模式）

### 3. 同步实体注册 — `packages/core/src/sync/entities.ts`
- `SYNC_ENTITIES` 添加 `'foodPreset'`

### 4. SyncDataMap — `packages/core/src/store/types.ts`
- `SyncDataMap` 添加 `foodPreset: CustomFoodPreset`

### 5. Store 层 — `packages/core/src/store/createDietSlice.ts`
- `addCustomFoodPreset()`: 追加 `updatedAt, deleted` 字段，调用 `adapter.persistChange('foodPreset', ...)`, `onSync?.()`
- `removeCustomFoodPreset()`: 软删除，调用 `adapter.markDeleted('foodPreset', ...)`, `onSync?.()`

### 6. SQLite 表 — `apps/mobile/src/db/schema.ts`
- 新增 `custom_food_presets` 表创建语句
- 表结构: `id TEXT PRIMARY KEY, name TEXT, calories INTEGER, note TEXT, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0`

### 7. PocketBase — `backend/`
- 创建 `custom_food_presets` collection
- 字段: `preset_id` (text, required), `data` (json), `user_id` (relation), `updated_at` (datetime)
- 添加 PB hook (`pb_hooks/`) 处理 data JSON 序列化

### 8. AI 搜索 — 可选
- 如果 `@egoless-do/core` 有 AI 搜索索引注册，需要添加 `foodPreset` 实体类型

## 数据流

### 写入
```
AddFoodModal.handleSavePreset()
  → store.addCustomFoodPreset(name, cal, note)
    → Zustand set() 更新内存
    → adapter.persistChange('foodPreset', id, { id, name, calories, note, updatedAt, deleted: false })
      → WriteBatcher(100ms) → SQLite INSERT/UPDATE
    → onSync?.()
      → SyncEngine → PB
```

### 读取
```
应用启动 → rehydrateFromDb() → useAppStore.setState()
  → customFoodPresets 从 SQLite 加载到内存
  → UI 通过 useShallowStore(s => s.customFoodPresets) 读取
```

### 删除
```
AddFoodModal (或未来列表管理)
  → store.removeCustomFoodPreset(id)
    → Zustand set() 标记 deleted
    → adapter.markDeleted('foodPreset', id)
    → onSync?.()
```

## 兼容性

- 无需数据迁移：当前 `customFoodPresets` 仅存在于内存，无 SQLite 数据
- 向后兼容：现有 AddFoodModal 通过 `customFoodPresets` 读取，接口不变
- 冲突处理：SyncEngine 的现有冲突策略（last-write-wins）自动适用

## 风险

- 低风险：变更集中在新增实体，不修改已有数据流
- 建议先在开发环境测试 PB collection 和 hook 配置