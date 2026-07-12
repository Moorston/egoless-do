# 饮食弹窗页我的tab数据持久化+PB同步 — 执行计划

## 执行顺序清单

### Step 1: 扩展数据模型
- [ ] 修改 `packages/core/src/types/food.ts` — `CustomFoodPreset` 增加 `updatedAt: number` 和 `deleted: boolean`

### Step 2: 注册实体 Schema
- [ ] 修改 `packages/core/src/sync/entitySchemas.ts` — 新增 `foodPreset` schema（PB data JSON 格式）
- [ ] 修改 `packages/core/src/sync/entities.ts` — `SYNC_ENTITIES` 添加 `'foodPreset'`
- [ ] 修改 `packages/core/src/store/types.ts` — `SyncDataMap` 添加 `foodPreset: CustomFoodPreset`

### Step 3: 更新 Store 层
- [ ] 修改 `packages/core/src/store/createDietSlice.ts` — `addCustomFoodPreset()` 改用 `adapter.persistChange()` + `onSync?.()`
- [ ] 修改 `createDietSlice.ts` — `removeCustomFoodPreset()` 改用 `adapter.markDeleted()` + `onSync?.()`

### Step 4: SQLite 表
- [ ] 修改 `apps/mobile/src/db/schema.ts` — 添加 `custom_food_presets` 表创建
- [ ] 添加 `custom_food_presets` 到 `ALL_ENTITY_TABLES` 等价列表（如果有）

### Step 5: PocketBase 后端
- [ ] 在 PocketBase admin 创建 `custom_food_presets` collection 或创建迁移脚本
- [ ] 字段: `preset_id` (text, required), `data` (json), `user_id` (relation to users), `updated_at` (datetime)
- [ ] 添加 PB hook 处理 data JSON 格式

### Step 6: 验证
- [ ] 运行 `pnpm run type-check` 确保类型正确
- [ ] 运行 `pnpm run test` 确保测试通过
- [ ] 如果存在现有测试 `createDietSlice.test.ts` 和 `createFoodSlice.test.ts`，检查是否需要更新

## 验证命令

```bash
pnpm run type-check
pnpm run test
```

## 风险文件

- `packages/core/src/sync/entitySchemas.ts` — 实体注册错误会导致同步失败
- `apps/mobile/src/db/schema.ts` — 表创建失败会导致应用启动崩溃
- `packages/core/src/store/createDietSlice.ts` — 数据写入逻辑错误会导致数据丢失

## 回滚点

- 如果 Step 1-3 后类型检查失败：撤销所有变更
- 如果 Step 4 后应用启动失败：回滚 schema 变更
- 如果 Step 5 后同步失败：检查 PB collection 配置和 hook 日志