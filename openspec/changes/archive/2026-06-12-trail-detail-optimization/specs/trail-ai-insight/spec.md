## ADDED Requirements

### Requirement: AI 洞察生成

系统 SHALL 在脉络详情页提供 AI 洞察生成功能，分析脉络中的感念和脉络感念，生成结构化洞察。

#### Scenario: 手动触发生成洞察
- **WHEN** 用户点击"生成洞察"按钮
- **THEN** 系统调用 `AIService.generateTrailInsight(reflections, trailNotes)` 生成洞察
- **THEN** 展示加载状态"正在生成洞察..."
- **THEN** 生成完成后将结果缓存到 `ThoughtTrail.insightCache`

#### Scenario: 展示已缓存的洞察
- **WHEN** 用户进入详情页且 `insightCache` 存在
- **THEN** 直接展示缓存的洞察内容，包含：核心摘要、关键要点、转折点、建议
- **THEN** 显示生成时间

#### Scenario: 重新生成洞察
- **WHEN** 用户点击"重新生成"按钮
- **THEN** 系统重新调用 AI 生成洞察
- **THEN** 新结果覆盖旧缓存

#### Scenario: 无缓存时的展示
- **WHEN** 用户进入详情页且无 `insightCache`
- **THEN** 仅展示"生成洞察"按钮

### Requirement: 洞察缓存持久化

系统 SHALL 将 AI 洞察结果持久化到 ThoughtTrail 实体上。

```typescript
export interface TrailInsightCache {
  summary: string;         // 核心摘要
  keyPoints: string[];     // 关键要点
  turningPoints: string[]; // 转折点
  suggestions: string[];   // 建议
  generatedAt: number;     // 生成时间戳
  model?: string;          // 使用的模型
  source: 'local' | 'cloud';
}
```

#### Scenario: 缓存写入
- **WHEN** AI 洞察生成完成
- **THEN** 调用 `store.setInsightCache(trailId, cache)` 将结果写入 ThoughtTrail
- **THEN** `insightCache` 字段随 ThoughtTrail 一起持久化和同步

#### Scenario: 兼容旧版 insightSummary
- **WHEN** ThoughtTrail 有 `insightSummary` 但无 `insightCache`
- **THEN** 读取时将 `insightSummary` 作为 `insightCache.summary` 展示

### Requirement: 洞察纳入脉络感念分析

系统 SHALL 在生成洞察时同时分析普通感念和脉络感念。

#### Scenario: 包含脉络感念的洞察
- **WHEN** 脉络中同时存在普通感念和脉络感念
- **THEN** AI 洞察分析覆盖所有感念，脉络感念的反思内容作为深度分析的输入

### Requirement: 洞察 UI 展示

系统 SHALL 在详情页中以结构化方式展示洞察。

#### Scenario: 展示洞察各部分
- **WHEN** 洞察已缓存
- **THEN** 分别展示：📝 核心摘要、🔑 关键要点（列表）、🔄 转折点（列表）、💡 建议（列表）
