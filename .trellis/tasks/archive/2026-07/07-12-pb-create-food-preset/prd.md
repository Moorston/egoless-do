# PB 创建 custom_food_presets collection

## Goal

在 PocketBase 实例中创建 `custom_food_presets` 集合，使食品预设数据持久化功能能正常工作。

## Background

- `pb_schema.json` 中已定义 `custom_food_presets` collection（之前任务中添加）
- PB hooks（`sync.pb.js`, `sync_push_pull.pb.js`）中已注册 `foodPreset` 实体映射
- 但 PocketBase **不会自动**根据 `pb_schema.json` 创建 collection，需要手动或通过脚本应用
- PB schema 定义：`user_id`(text) + `preset_id`(text) + `data`(json) + `updated_at`(autodate)

## Requirements

### R1: 在 PB 实例中创建 `custom_food_presets` collection
- 字段：`user_id`(text, required), `preset_id`(text, required), `data`(json), `updated_at`(autodate)
- 权限规则：`@request.auth.id = user_id`
- 确保与 `pb_schema.json` 和 pb_hooks 中的实体映射一致

### R2: 提供创建脚本或文档
- 确保后续添加新 collection 时有标准流程可循

## Acceptance Criteria

- [ ] `custom_food_presets` collection 在 PB Admin UI 中可见
- [ ] `data` JSON 字段可正常写入/读取
- [ ] 同步功能可正常 push/pull `foodPreset` 实体

## Out of Scope

- 修改客户端代码
- 修改 pb_hooks sync 逻辑

## Open Questions (已解决)

1. **创建方式**: PB 初始化 hook（`onAfterBootstrap`）自动检查并创建 collection

## 设计要点

- 新建 `backend/pb_hooks/init.pb.js`，使用 `onAfterBootstrap` 事件
- 启动时检查 `custom_food_presets` 是否存在，不存在则自动创建
- 字段定义与 `pb_schema.json` 一致
- 同时为未来其他缺失 collection 提供自愈能力