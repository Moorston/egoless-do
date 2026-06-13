## ADDED Requirements

### Requirement: AI 结果缓存
系统 SHALL 缓存 AI 推荐和查询结果，相同输入直接返回缓存，避免重复调用。

#### Scenario: 缓存命中
- **WHEN** 用户第二次输入相同查询
- **THEN** 系统直接返回缓存结果，不调用 AI

#### Scenario: 缓存未命中
- **WHEN** 用户输入新查询
- **THEN** 系统调用 AI 并将结果写入缓存

### Requirement: 缓存键生成
系统 SHALL 基于查询内容和感念 ID 集合生成唯一缓存键。

#### Scenario: 相同查询不同感念
- **WHEN** 查询相同但感念集合不同
- **THEN** 系统生成不同的缓存键，不复用缓存

#### Scenario: 缓存键格式
- **WHEN** 生成缓存键
- **THEN** 系统使用 SHA-256 哈希，取前 16 位十六进制字符串

### Requirement: 缓存过期策略
系统 SHALL 支持缓存 TTL，默认 5 分钟过期。

#### Scenario: 缓存过期
- **WHEN** 缓存写入超过 5 分钟
- **THEN** 系统视为缓存未命中，重新调用 AI

#### Scenario: 手动清除缓存
- **WHEN** 用户触发刷新操作
- **THEN** 系统清除相关缓存条目

### Requirement: 缓存容量限制
系统 SHALL 限制缓存条目数量，最多保留 50 条，超出时淘汰最旧条目。

#### Scenario: 缓存满
- **WHEN** 缓存条目达到 50 条
- **THEN** 系统淘汰最早写入的条目，腾出空间
