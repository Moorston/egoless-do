## ADDED Requirements

### Requirement: 复盘引导生成

系统 SHALL 在脉络详情页提供复盘引导生成功能，基于脉络内容生成观察发现和引导问题。

#### Scenario: 手动触发生成复盘引导
- **WHEN** 用户点击"生成复盘引导"按钮
- **THEN** 系统调用 `AIService.generateTrailReviewGuide(trail, reflections, trailNotes)` 生成引导
- **THEN** 展示加载状态"正在生成复盘引导..."
- **THEN** 生成完成后将结果缓存到 `ThoughtTrail.reviewCache`

#### Scenario: 展示已缓存的复盘引导
- **WHEN** 用户进入详情页且 `reviewCache` 存在
- **THEN** 展示观察发现和引导问题列表
- **THEN** 展示"开始写反思"和"重新生成"按钮

#### Scenario: 重新生成复盘引导
- **WHEN** 用户点击"重新生成"按钮
- **THEN** 系统重新调用 AI 生成复盘引导，新结果覆盖旧缓存

### Requirement: 复盘引导缓存持久化

系统 SHALL 将复盘引导结果持久化到 ThoughtTrail 实体上。

```typescript
export interface TrailReviewCache {
  questions: string[];     // 引导问题
  observations: string[];  // 观察发现
  suggestions: string[];   // 复盘建议
  generatedAt: number;
  model?: string;
  source: 'local' | 'cloud';
}
```

#### Scenario: 缓存写入
- **WHEN** 复盘引导生成完成
- **THEN** 调用 `store.setReviewCache(trailId, cache)` 将结果写入 ThoughtTrail

### Requirement: 引导式反思写作

系统 SHALL 支持用户基于复盘引导问题写反思。

#### Scenario: 从引导问题开始写反思
- **WHEN** 用户点击"开始写反思"
- **THEN** 弹出写反思弹窗，顶部展示引导问题
- **THEN** 用户输入内容后保存为 TrailNote，`source` 为 `'guided'`，`guidedQuestion` 记录引导问题

#### Scenario: 选择特定引导问题写反思
- **WHEN** 用户点击某个具体的引导问题
- **THEN** 弹出写反思弹窗，顶部展示该特定问题
- **THEN** 保存的 TrailNote 的 `guidedQuestion` 为该问题

#### Scenario: 跳过引导自由写反思
- **WHEN** 用户点击"写反思"入口（非从引导进入）
- **THEN** 弹出写反思弹窗，无引导问题
- **THEN** 保存的 TrailNote 的 `source` 为 `'free'`

### Requirement: 引导式反思弹窗 UI

系统 SHALL 提供写反思的专用弹窗。

#### Scenario: 弹窗内容
- **WHEN** 写反思弹窗打开
- **THEN** 弹窗包含：引导问题展示区（可选）、内容输入区、标签输入、心情选择、保存/取消按钮

#### Scenario: 引导问题展示
- **WHEN** 从引导问题进入写反思
- **THEN** 弹窗顶部以引用样式展示引导问题，格式为"💭 引导问题：{问题内容}"
