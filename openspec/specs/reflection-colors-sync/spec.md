## ADDED Requirements

### Requirement: 同步 push 包含 colors 字段
`reflectionToSync()` 构建同步 payload 时 SHALL 包含 `colors` 字段，使服务器能正确存储感念卡片的渐变色数据。

#### Scenario: 新感念同步到服务器
- **WHEN** 用户创建一条新感念并触发同步 push
- **THEN** push payload 中 SHALL 包含该感念的 `colors` 数组，服务器完整存储

#### Scenario: 已有色感念更新后同步
- **WHEN** 用户修改已有感念的颜色并触发同步
- **THEN** push payload 中 `colors` 字段 SHALL 反映更新后的值

### Requirement: 同步 pull 不覆盖本地 colors
`INSERT OR REPLACE` 语句 SHALL 包含 `colors` 列，避免 pull 时将本地已有的 colors 数据覆盖为 NULL。

#### Scenario: 服务器返回的感念包含 colors
- **WHEN** 同步 pull 下来的感念数据包含 `colors` 字段
- **THEN** SQLite 中该感念的 `colors` 列 SHALL 被正确写入

#### Scenario: 服务器返回的感念不含 colors（旧数据）
- **WHEN** 同步 pull 下来的感念数据不包含 `colors` 字段
- **THEN** 保留逻辑 SHALL 从 SQLite 读取本地 colors 并恢复，不被覆盖为 NULL

### Requirement: 保留逻辑正确传递数组类型
保留逻辑从 SQLite 读取 colors JSON 字符串后，SHALL 将其 `JSON.parse` 为数组再合并到 store patch，而非传递原始字符串。

#### Scenario: 本地 colors 存在时恢复为数组
- **WHEN** 服务器返回的感念无 colors，但本地 SQLite 中有 colors 记录
- **THEN** 合并到 store patch 的 `colors` SHALL 为 `readonly [string, string]` 类型的数组

#### Scenario: 本地 colors 也不存在时保持 undefined
- **WHEN** 服务器返回的感念无 colors，本地 SQLite 中也无 colors 记录
- **THEN** 合并到 store patch 的 `colors` SHALL 为 undefined，UI 使用 fallback 颜色

### Requirement: UI 层兼容字符串类型的 colors
UI 渲染组件 SHALL 对 `typeof colors === 'string'` 的情况做 `JSON.parse` 兼容处理，确保已损坏数据能正常显示。

#### Scenario: colors 为 JSON 字符串时正确解析
- **WHEN** 感念的 `colors` 值为字符串 `'["#6366f1","#8b5cf6"]'`
- **THEN** 渲染时 SHALL 将其解析为数组 `['#6366f1', '#8b5cf6']` 后用于 LinearGradient

#### Scenario: colors 为正常数组时不受影响
- **WHEN** 感念的 `colors` 值为数组 `['#6366f1', '#8b5cf6']`
- **THEN** 渲染逻辑 SHALL 保持不变，直接使用

#### Scenario: colors 为 undefined 时使用 fallback
- **WHEN** 感念的 `colors` 值为 undefined 或 null
- **THEN** 渲染时 SHALL fallback 到 `MIND_COLORS_EXTENDED[0]`

### Requirement: Web 端同步修复与 Mobile 一致
Web 端的 `syncService.ts` 和 `useWebStore.ts` SHALL 同步修复 colors 字段的 push/pull/合并逻辑，与 Mobile 端行为一致。

#### Scenario: Web 端感念 colors 同步正确
- **WHEN** 用户在 Web 端创建带颜色的感念并触发同步
- **THEN** 服务器存储的 payload SHALL 包含 colors 字段

#### Scenario: Web 端 pull 后 colors 保留
- **WHEN** Web 端同步 pull 感念数据
- **THEN** 已有的 colors 数据 SHALL 不被覆盖为 NULL
