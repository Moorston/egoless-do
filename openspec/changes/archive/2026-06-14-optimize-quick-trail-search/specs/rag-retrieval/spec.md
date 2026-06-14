## MODIFIED Requirements

### Requirement: 本地感念检索

系统 SHALL 提供本地感念检索功能，基于多维评分算法从感念集合中筛选 Top-K 相关结果。同时导出 `expandTerms` 和 `SYNONYM_MAP` 供外部模块使用。

#### Scenario: 关键词匹配检索
- **WHEN** 用户输入查询 "工作压力大"
- **THEN** 系统返回包含 "压力"、"工作"、"焦虑" 等关键词的感念，按相关性排序

#### Scenario: 多维评分排序
- **WHEN** 多条感念匹配关键词
- **THEN** 系统按关键词权重（35%）+ 同义词扩展（25%）+ 情绪匹配（20%）+ 时间衰减（10%）+ 标签匹配（10%）综合评分排序

#### Scenario: 空查询处理
- **WHEN** 查询为空或仅含空格
- **THEN** 系统返回空数组，不执行检索

#### Scenario: 导出同义词表
- **WHEN** 外部模块需要情绪/话题同义词映射
- **THEN** 系统导出 `SYNONYM_MAP` 和 `expandTerms` 函数

### Requirement: 检索结果数量控制

系统 SHALL 支持通过参数控制返回结果数量，默认返回 Top-5。返回结果包含 `index`（原始 ReflectionIndex）和 `score`（多维评分）。

#### Scenario: 自定义返回数量
- **WHEN** 调用检索时指定 k=20
- **THEN** 系统返回最多 20 条相关感念，每条包含 score 字段

#### Scenario: 结果不足
- **WHEN** 匹配结果少于请求数量
- **THEN** 系统返回所有匹配结果，不填充无关内容

### Requirement: AI 结果缓存

系统 SHALL 缓存 AI 搜索结果，使用 query + 数据指纹(count + latestTimestamp)作为缓存 key。

#### Scenario: 缓存命中
- **WHEN** 相同查询在数据未变化时重复执行
- **THEN** 系统返回缓存结果，不重复调用 AI

#### Scenario: 数据变化后缓存失效
- **WHEN** 新增感念导致 count 或 latestTimestamp 变化
- **THEN** 旧缓存自动失效，系统重新执行 AI 搜索

#### Scenario: 缓存 key 不包含全量 ID
- **WHEN** 生成缓存 key
- **THEN** 使用 `query|count:latestTimestamp` 格式，不包含所有 reflection ID
