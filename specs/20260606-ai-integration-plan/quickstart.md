# AI 集成快速验证指南

**Date**: 2026-06-06

## 前置条件

1. **Node.js** >= 18
2. **pnpm** workspace 已配置
3. **PocketBase** 实例运行中
4. **DeepSeek API Key** (从 platform.deepseek.com 获取)

## 环境配置

### 1. 添加环境变量

在 `apps/web/.env.local` 中添加:

```env
# AI 配置
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-xxxxxxxxxxxxxxxx
AI_MODEL=deepseek-chat
```

### 2. PocketBase Collection 创建

通过 PocketBase Admin UI 或 API 创建以下 collections:

**ai_cache**:
- cacheKey (text, unique, required)
- feature (text, required)
- contentHash (text, required)
- prompt (text, required)
- response (text, required)
- structuredResult (text)
- model (text, required)
- inputTokens (number)
- outputTokens (number)
- userId (relation → users, required)
- expiresAt (date)

**ai_usage**:
- userId (relation → users, required)
- date (text, required)
- callCount (number, required)
- inputTokens (number)
- outputTokens (number)
- lastCallAt (date)

## 验证场景

### 场景 1: 感念总结 API

**目标**: 验证 AI 代理端点能正确调用 DeepSeek 并返回总结

**步骤**:
1. 启动 Web 开发服务器: `pnpm --filter @egoless-do/web dev`
2. 创建 2-3 条测试感念记录（带内容、标签、情绪）
3. 调用 API:

```bash
curl -X POST http://localhost:3000/api/ai/reflection/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"reflectionIds": ["<id1>", "<id2>"]}'
```

**预期结果**:
- 返回 200 状态码
- 响应包含 `summary`、`themes`、`moodTrend` 字段
- `cached` 为 `false`（首次调用）
- 重复调用相同请求，`cached` 应为 `true`

### 场景 2: 缓存验证

**目标**: 验证缓存机制正常工作

**步骤**:
1. 调用感念总结 API（同场景 1）
2. 检查 PocketBase `ai_cache` collection，应有新记录
3. 再次调用相同 API
4. 验证响应中 `cached: true`

**预期结果**:
- 首次调用创建缓存记录
- 后续调用命中缓存，不消耗 API 额度
- 缓存记录包含正确的 `inputTokens` 和 `outputTokens`

### 场景 3: 配额限制

**目标**: 验证每日配额限制生效

**步骤**:
1. 调用 `/api/ai/quota` 查看当前配额
2. 连续调用 AI API 50 次
3. 第 51 次调用应返回 403 错误

**预期结果**:
- 配额查询返回正确的 `callCount` 和 `callLimit`
- 超限时返回 `QUOTA_EXCEEDED` 错误码
- 错误消息友好提示用户

### 场景 4: 流式响应

**目标**: 验证 SSE 流式输出

**步骤**:
```bash
curl -N -X POST http://localhost:3000/api/ai/reflection/summary \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <token>" \
  -d '{"reflectionIds": ["<id1>"]}'
```

**预期结果**:
- 响应为 SSE 格式
- 包含多个 `data:` 行
- 最后一行包含 `type: "done"` 和 usage 统计

## 故障排查

### API Key 无效
- 检查 `.env.local` 中的 `AI_API_KEY` 是否正确
- 确认 DeepSeek 账户有可用额度

### PocketBase 连接失败
- 确认 PocketBase 实例运行中
- 检查 collection 是否正确创建
- 验证 userId 关联字段

### 流式响应中断
- 检查网络连接
- 确认 Next.js API Route 正确配置 CORS
- 查看浏览器控制台 SSE 连接状态
