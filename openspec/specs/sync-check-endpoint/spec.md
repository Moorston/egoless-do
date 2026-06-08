## ADDED Requirements

### Requirement: 轻量变更检测端点
服务器 SHALL 提供 GET /api/sync/check 端点，返回指定时间戳之后是否有变更，避免客户端无变更时的全量拉取。

#### Scenario: 有变更时返回 true
- **WHEN** 客户端请求 GET /api/sync/check?since=1717680000000，服务器在该时间戳之后有 3 条更新
- **THEN** 服务器返回 `{ hasChanges: true, count: 3 }`

#### Scenario: 无变更时返回 false
- **WHEN** 客户端请求 GET /api/sync/check?since=1717680000000，服务器在该时间戳之后无更新
- **THEN** 服务器返回 `{ hasChanges: false, count: 0 }`

#### Scenario: 缺少 since 参数
- **WHEN** 客户端请求 GET /api/sync/check（无 since 参数）
- **THEN** 服务器返回 400 错误，提示缺少 since 参数

#### Scenario: 未认证请求
- **WHEN** 客户端未携带有效的 Authorization 头
- **THEN** 服务器返回 401 未认证错误

### Requirement: check 端点性能约束
check 端点 SHALL 轻量化，响应时间 < 100ms，响应体 < 200 bytes。

#### Scenario: 大数据量用户仍快速响应
- **WHEN** 用户有 2000 条记录，请求 check 端点
- **THEN** 服务器仅查询各 collection 的更新计数（不拉取完整数据），响应时间 < 100ms

### Requirement: 客户端轮询优化
Mobile 端 SHALL 使用 60s 间隔轮询 check 端点，有变更时才触发完整同步。

#### Scenario: 有变更触发完整同步
- **WHEN** 60s 轮询检测到 hasChanges=true
- **THEN** 客户端触发完整的 runSync() 流程（drainQueue → POST /api/sync → applyServerChanges）

#### Scenario: 无变更跳过同步
- **WHEN** 60s 轮询检测到 hasChanges=false
- **THEN** 客户端不触发同步，等待下一个轮询周期

#### Scenario: 有待推送变更时跳过 check
- **WHEN** sync_queue 中有待同步记录
- **THEN** 客户端直接触发完整同步，不先调 check 端点

### Requirement: 移除 SSE 实时同步端点
服务器 SHALL 移除 GET /api/sync/realtime 端点，该端点仅被已废弃的 Web 前端使用。

#### Scenario: 请求已移除的 SSE 端点
- **WHEN** 客户端请求 GET /api/sync/realtime
- **THEN** 服务器返回 404

#### Scenario: core 包不再导出 RealtimeSyncService
- **WHEN** 代码 import { RealtimeSyncService } from '@egoless-do/core'
- **THEN** 编译错误，该导出已移除
