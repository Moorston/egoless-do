## ADDED Requirements

### Requirement: 写入时同步入队
当业务代码写入本地 SQLite 时，系统 SHALL 同时将变更以 JSON payload 形式写入 sync_queue 表，无需等待同步触发。

#### Scenario: 新增记录自动入队
- **WHEN** 用户在 Mobile 端创建一条新的 habit 记录并保存到 SQLite
- **THEN** 系统在 sync_queue 表中插入一条记录，包含 entity='habit'、entityId、operation='upsert'、payload（camelCase JSON 格式，与服务器 API 格式一致）

#### Scenario: 更新记录自动入队
- **WHEN** 用户修改一条已有的 reflection 记录
- **THEN** 系统先删除 sync_queue 中同 entity+entityId 的旧记录，再插入新记录（去重：只保留最新状态）

#### Scenario: 删除记录入队
- **WHEN** 用户删除一条 fasting 记录（软删除）
- **THEN** 系统在 sync_queue 中插入 operation='delete' 的记录，payload 包含 entityId 和 deleted=true

### Requirement: 同步时从队列取出推送
系统 SHALL 通过 drainQueue() 从 sync_queue 中取出待同步变更，推送到服务器，成功后移除队列中的记录。

#### Scenario: 正常同步流程
- **WHEN** 用户切回前台触发同步
- **THEN** 系统执行 drainQueue(50) 取出最多 50 条记录，通过 POST /api/sync 推送到服务器，成功后调用 removeQueueItems() 删除已同步的记录

#### Scenario: 队列为空时跳过推送
- **WHEN** sync_queue 表中没有待同步记录
- **THEN** 系统跳过推送步骤，直接进入拉取阶段

#### Scenario: 推送失败保留队列
- **WHEN** POST /api/sync 返回错误（非 rejected，而是网络错误等）
- **THEN** sync_queue 中的记录保持不变，下次同步时重试

### Requirement: 通用 apply 服务器变更
系统 SHALL 使用 entity → table 映射和通用 INSERT OR REPLACE 逻辑应用服务器返回的变更，不再逐实体手写 SQL。

#### Scenario: 应用服务器返回的 habit 变更
- **WHEN** 服务器返回 changes 数组中包含 entity='habit' 的记录
- **THEN** 系统通过 ENTITY_CONFIG 映射到 habits 表，比较 updatedAt 时间戳，INSERT OR REPLACE 到本地 SQLite

#### Scenario: 跳过本地已删除的记录
- **WHEN** 服务器返回一条记录，但本地该记录已被软删除（deleted=1）
- **THEN** 系统跳过该记录，不覆盖本地删除状态

#### Scenario: 特殊字段保护
- **WHEN** 服务器返回的 reflection 记录缺少 colors 字段，但本地记录有 colors
- **THEN** 系统保留本地 colors 字段，不被服务器数据覆盖

### Requirement: 旧数据迁移
系统 SHALL 在升级后首次启动时，自动将 synced=0 的旧数据迁移到 sync_queue。

#### Scenario: 检测到旧数据并迁移
- **WHEN** 用户升级到新版本，app_state 中不存在 sync_queue_migrated 标记
- **THEN** 系统扫描所有 synced=0 的记录，构造 payload 写入 sync_queue，标记 synced=1，并在 app_state 中写入 sync_queue_migrated=1

#### Scenario: 已迁移则跳过
- **WHEN** app_state 中已存在 sync_queue_migrated=1
- **THEN** 系统跳过迁移逻辑，直接使用 sync_queue 模式

### Requirement: synced 列语义简化
synced 列 SHALL 仅作为只读标记（0=未推送，1=已推送），不再参与同步检测流程。

#### Scenario: synced 标记更新
- **WHEN** sync_queue 中的记录成功推送到服务器
- **THEN** 对应实体表中的 synced 列更新为 1

#### Scenario: synced 列不参与变更检测
- **WHEN** 系统执行同步
- **THEN** 系统不查询 synced 列，仅通过 sync_queue 获取待同步变更
