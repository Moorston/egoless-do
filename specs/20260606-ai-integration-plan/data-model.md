# AI 集成数据模型

**Date**: 2026-06-06

## 新增实体

### 1. AI 缓存记录 (ai_cache)

存储 AI 调用结果，避免重复请求。

```typescript
interface AiCacheEntry {
  id: string;                    // PocketBase record ID
  cacheKey: string;              // "{feature}_{content_hash}"
  feature: AiFeature;            // 功能标识
  contentHash: string;           // 源数据内容哈希 (SHA-256)
  prompt: string;                // 发送给 AI 的 prompt
  response: string;              // AI 原始响应
  structuredResult: string;      // JSON 格式的结构化结果
  model: string;                 // 使用的模型标识
  inputTokens: number;           // 输入 token 数
  outputTokens: number;          // 输出 token 数
  userId: string;                // 用户 ID
  createdAt: string;             // ISO 时间戳
  expiresAt: string;             // 过期时间
}

type AiFeature =
  | 'reflection_summary'         // 感念总结
  | 'reflection_insight'         // 感念洞察
  | 'food_analysis'              // 饮食分析
  | 'habit_insight'              // 习惯洞察
  | 'exercise_analysis'          // 运动分析
  | 'semantic_similarity';       // 语义相似度
```

**验证规则**:
- `cacheKey` 唯一
- `contentHash` 为 64 字符十六进制字符串
- `expiresAt` 必须晚于 `createdAt`

**状态转换**:
- 创建 → 有效 → 过期/失效
- 源数据变更时标记失效（删除记录）

---

### 2. AI 使用配额 (ai_usage)

追踪用户 AI 调用配额。

```typescript
interface AiUsage {
  id: string;
  userId: string;
  date: string;                  // YYYY-MM-DD
  callCount: number;             // 当日调用次数
  inputTokens: number;           // 当日输入 token 总量
  outputTokens: number;          // 当日输出 token 总量
  lastCallAt: string;            // 最后调用时间
}
```

**验证规则**:
- `userId` + `date` 联合唯一
- `callCount` >= 0
- `date` 格式为 YYYY-MM-DD

---

### 3. AI 功能配置 (ai_settings)

用户级别的 AI 功能开关。

```typescript
interface AiSettings {
  id: string;
  userId: string;
  enabledFeatures: AiFeature[];  // 启用的 AI 功能列表
  consentGivenAt: string;        // 用户同意时间
  consentVersion: string;        // 同意版本号
}
```

---

## 现有实体扩展

### MindReflection 扩展

```typescript
// 新增可选字段
interface MindReflection {
  // ... 现有字段 ...
  aiSummary?: string;            // AI 生成的摘要
  aiInsight?: string;            // AI 生成的洞察
  aiUpdatedAt?: string;          // AI 分析时间
}
```

### FoodEntry 扩展

```typescript
interface FoodEntry {
  // ... 现有字段 ...
  aiNutrition?: AiNutrition;     // AI 营养分析
}

interface AiNutrition {
  protein: number;               // 蛋白质 (g)
  carbs: number;                 // 碳水化合物 (g)
  fat: number;                   // 脂肪 (g)
  fiber: number;                 // 膳食纤维 (g)
  confidence: number;            // 置信度 0-1
}
```

### Habit 扩展

```typescript
interface Habit {
  // ... 现有字段 ...
  aiInsight?: string;            // AI 习惯洞察
  aiNextAction?: string;         // AI 建议的下一步行动
}
```

---

## PocketBase Collection 定义

### ai_cache

```json
{
  "name": "ai_cache",
  "type": "base",
  "fields": [
    { "name": "cacheKey", "type": "text", "required": true, "unique": true },
    { "name": "feature", "type": "text", "required": true },
    { "name": "contentHash", "type": "text", "required": true },
    { "name": "prompt", "type": "text", "required": true },
    { "name": "response", "type": "text", "required": true },
    { "name": "structuredResult", "type": "text" },
    { "name": "model", "type": "text", "required": true },
    { "name": "inputTokens", "type": "number" },
    { "name": "outputTokens", "type": "number" },
    { "name": "userId", "type": "relation", "collection": "users", "required": true },
    { "name": "expiresAt", "type": "date" }
  ]
}
```

### ai_usage

```json
{
  "name": "ai_usage",
  "type": "base",
  "fields": [
    { "name": "userId", "type": "relation", "collection": "users", "required": true },
    { "name": "date", "type": "text", "required": true },
    { "name": "callCount", "type": "number", "required": true },
    { "name": "inputTokens", "type": "number" },
    { "name": "outputTokens", "type": "number" },
    { "name": "lastCallAt", "type": "date" }
  ]
}
```
