## ADDED Requirements

### Requirement: TrailNote 数据模型

系统 SHALL 定义 `TrailNote` 接口，作为脉络内反思笔记的独立实体。

```typescript
export interface TrailNote extends Syncable {
  id: string;
  trailId: string;           // 所属脉络 ID
  content: string;           // 内容
  tags: string[];            // 标签
  mood?: Mood;               // 心情（可选）
  source: 'guided' | 'free'; // 来源：AI引导 / 自由写作
  guidedQuestion?: string;   // 引导问题（guided 时有值）
  order: number;             // 排序
  createdAt: number;
  updatedAt: number;
}
```

#### Scenario: 创建引导式脉络感念
- **WHEN** 用户在复盘引导中回答引导问题并保存
- **THEN** 系统创建 TrailNote，`source` 为 `'guided'`，`guidedQuestion` 记录引导问题，`trailId` 指向当前脉络

#### Scenario: 创建自由脉络感念
- **WHEN** 用户点击"写反思"并自由输入内容保存
- **THEN** 系统创建 TrailNote，`source` 为 `'free'`，`guidedQuestion` 为 `undefined`

#### Scenario: 脉络感念只在脉络内可见
- **WHEN** 用户查看主感念列表
- **THEN** TrailNote 不出现在主感念列表中
- **WHEN** 用户进入脉络详情页
- **THEN** TrailNote 在时间线中展示

### Requirement: TrailNote CRUD 操作

系统 SHALL 提供 TrailNote 的增删改查 Store 方法。

#### Scenario: 添加脉络感念到脉络
- **WHEN** 调用 `addTrailNote(trailId, form)`
- **THEN** 创建 TrailNote 并将其 ID 添加到 `ThoughtTrail.noteIds` 末尾

#### Scenario: 更新脉络感念
- **WHEN** 调用 `updateTrailNote(noteId, patch)`
- **THEN** 更新 TrailNote 的对应字段

#### Scenario: 删除脉络感念
- **WHEN** 调用 `deleteTrailNote(noteId)`
- **THEN** TrailNote 标记为 `deleted: true`，并从 `ThoughtTrail.noteIds` 中移除

### Requirement: TrailNote 同步

系统 SHALL 将 TrailNote 纳入同步机制。

#### Scenario: 注册同步实体
- **WHEN** 系统初始化同步配置
- **THEN** `trailNote` 在 `SYNC_ENTITIES` 中注册，collection 为 `trail_notes`，ID 字段为 `note_id`

#### Scenario: TrailNote 数据同步
- **WHEN** TrailNote 发生变更
- **THEN** 变更通过 PocketBase SDK 同步到后端

### Requirement: TrailNote 数据库表

系统 SHALL 在本地 SQLite 中创建 `trail_notes` 表。

#### Scenario: 表结构
- **WHEN** 应用启动且数据库初始化
- **THEN** `trail_notes` 表包含字段：`id`(PK), `trail_id`, `content`, `tags`(JSON), `mood`, `source`, `guided_question`, `order`, `created_at`, `updated_at`, `deleted`
