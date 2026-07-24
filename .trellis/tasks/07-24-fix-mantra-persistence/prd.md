# 修复咒语/经文数据持久化丢失

## Goal
修复持咒页（我的咒语）和诵经页（我的经文）数据在 App 重启后丢失的问题，确保用户自定义的咒语和经文数据能够正确持久化到 SQLite 并支持 PocketBase 同步。

## 问题现象

用户添加自定义咒语后，重启 App 数据全部丢失。

## 根因分析

可能原因：
1. `rehydrateFromDb` 加载数据后，被 ghost check 或 validation 过滤掉
2. `initializePresetsIncremental` 覆盖了用户数据
3. `persistChange` 未能正确保存到 SQLite
4. store 数据被重置

## 已确认正常的部分

- `addMantraDef()` 调用 `adapter.persistChange('mantraDef', ...)`
- `SyncRehydrationManager.REHYDRATE_MAP` 包含 `mantraDef`
- entitySchema 配置了 PocketBase 同步

## 待验证

1. 数据是否正确保存到 SQLite（检查 `mantra_defs` 表）
2. 数据是否正确从 SQLite 加载到 store
3. ghost check 是否误过滤有效数据
4. `initializePresetsIncremental` 是否覆盖用户数据

## Requirements

- R1: 用户添加的自定义咒语在 App 重启后仍然存在
- R2: 预设咒语（如六字大明咒）正确显示
- R3: 数据正确同步到 PocketBase

## Acceptance Criteria
- [ ] A1: 添加自定义咒语 → 重启 App → 数据仍然存在
- [ ] A2: 预设咒语正确显示
- [ ] A3: 数据在 PocketBase 中可见
