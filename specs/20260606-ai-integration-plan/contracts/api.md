# AI API 接口契约

**Date**: 2026-06-06

## 概述

所有 AI 功能通过 Next.js API Routes 代理，客户端统一调用 `/api/ai/*` 端点。

## 基础信息

- **Base URL**: `/api/ai`
- **认证**: 复用现有 JWT 认证（通过 Cookie 或 Authorization Header）
- **格式**: JSON request/response，流式响应使用 SSE
- **错误码**: 统一 HTTP 状态码 + JSON 错误体

## 端点定义

### 1. 感念总结

**POST** `/api/ai/reflection/summary`

请求一个或多个感念的 AI 总结。

**Request**:
```typescript
{
  reflectionIds: string[];       // 感念 ID 列表（1-10 个）
  forceRefresh?: boolean;        // 强制刷新缓存，默认 false
}
```

**Response** (200):
```typescript
{
  summary: string;               // 总结文本（100-300 字）
  themes: string[];              // 提取的主题标签
  moodTrend: 'positive' | 'neutral' | 'negative' | 'mixed';
  model: string;                 // 使用的模型
  cached: boolean;               // 是否来自缓存
}
```

**错误**:
- 400: `reflectionIds` 为空或超出上限
- 403: AI 功能未启用或配额耗尽
- 404: 指定的感念不存在
- 429: 请求过于频繁
- 500: AI 服务异常

---

### 2. 感念洞察

**POST** `/api/ai/reflection/insight`

对单个感念生成深度洞察。

**Request**:
```typescript
{
  reflectionId: string;
  forceRefresh?: boolean;
}
```

**Response** (200):
```typescript
{
  insight: string;               // 洞察文本（150-400 字）
  emotions: string[];            // 识别的情绪标签
  suggestions: string[];         // 建议（0-3 条）
  model: string;
  cached: boolean;
}
```

---

### 3. 饮食分析

**POST** `/api/ai/food/analyze`

分析食物的营养成分。

**Request**:
```typescript
{
  foodName: string;              // 食物名称
  portion?: string;              // 份量描述，如 "一碗"、"200g"
  note?: string;                 // 备注信息
}
```

**Response** (200):
```typescript
{
  nutrition: {
    calories: number;            // 卡路里 (kcal)
    protein: number;             // 蛋白质 (g)
    carbs: number;               // 碳水化合物 (g)
    fat: number;                 // 脂肪 (g)
    fiber: number;               // 膳食纤维 (g)
  };
  confidence: number;            // 置信度 0-1
  tips: string[];                // 营养建议（0-2 条）
  model: string;
  cached: boolean;
}
```

---

### 4. 习惯洞察

**POST** `/api/ai/habit/insight`

分析习惯数据并提供建议。

**Request**:
```typescript
{
  habitId: string;
  forceRefresh?: boolean;
}
```

**Response** (200):
```typescript
{
  insight: string;               // 洞察文本
  patterns: string[];            // 识别的模式
  nextAction: string;            // 建议的下一步行动
  motivation: string;            // 激励语
  model: string;
  cached: boolean;
}
```

---

### 5. 配额查询

**GET** `/api/ai/quota`

查询当前用户的 AI 使用配额。

**Response** (200):
```typescript
{
  daily: {
    callCount: number;           // 已用调用次数
    callLimit: number;           // 调用上限 (50)
    inputTokens: number;         // 已用输入 token
    outputTokens: number;        // 已用输出 token
    tokenLimit: number;          // token 上限 (100000)
  };
  features: {
    [key in AiFeature]: boolean; // 各功能启用状态
  };
}
```

---

## 流式响应

部分端点支持流式输出（SSE 格式），通过 `Accept: text/event-stream` 请求头启用。

**SSE 格式**:
```
data: {"type":"chunk","content":"这是"}

data: {"type":"chunk","content":"一段"}

data: {"type":"chunk","content":"总结"}

data: {"type":"done","usage":{"inputTokens":120,"outputTokens":85}}
```

---

## 通用错误响应

```typescript
{
  error: {
    code: string;                // 错误码
    message: string;             // 用户友好提示
    details?: any;               // 调试信息（仅开发环境）
  }
}
```

**错误码**:
- `AI_DISABLED`: AI 功能未启用
- `QUOTA_EXCEEDED`: 配额耗尽
- `CACHE_HIT`: 缓存命中（非错误，用于调试）
- `PROVIDER_ERROR`: AI 服务提供商错误
- `INVALID_INPUT`: 输入参数无效
