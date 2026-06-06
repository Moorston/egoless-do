# AI 集成研究

**Date**: 2026-06-06

## 决策 1: AI 服务提供商

**选择**: DeepSeek API 作为主力，硅基流动 (SiliconFlow) 作为聚合备选

**理由**:
- DeepSeek 价格最低（输入 ¥1/1M tokens，缓存命中 ¥0.1/1M tokens）
- 完全兼容 OpenAI API 格式，可用 `openai` npm 包直接调用
- 中文语言质量优秀
- 支持 Function Calling，可输出结构化 JSON
- 有免费试用额度
- 硅基流动提供多模型聚合，避免管理多个 API Key

**备选方案**:
- 通义千问 (Qwen): 阿里百炼平台，OpenAI 兼容，免费额度充足，中文质量好
- 智谱 GLM-4-Flash: 免费使用，适合低优先级任务
- 月之暗面 (Kimi): 128k 长上下文，适合长文总结
- 百度文心: ERNIE Speed 免费，但 API 兼容性较差

**国内主流模型价格对比**:

| 提供商 | 主力模型 | 输入 (¥/1M tokens) | 输出 (¥/1M tokens) | OpenAI 兼容 | Function Calling | 免费额度 |
|--------|----------|--------------------|--------------------|-------------|-----------------|---------|
| DeepSeek | V3 | 1 (缓存 0.1) | 2 | 完全兼容 | 支持 | 有 |
| 通义千问 | Qwen-Plus | 2-4 | 6-12 | 完全兼容 | 支持 | 有 |
| 智谱AI | GLM-4-Flash | 免费 | 免费 | 兼容 | 支持 | 免费 |
| 月之暗面 | moonshot-v1 | 12 | 12 | 兼容 | 支持 | 试用 |
| 百度文心 | ERNIE Speed | 免费 | 免费 | 部分 | 支持 | 免费 |
| 讯飞星火 | Spark Lite | 免费 | 免费 | 不兼容 | 有限 | 免费 |
| 硅基流动 | 聚合多模型 | 按模型 | 按模型 | 完全兼容 | 支持 | 有 |

**结论**: DeepSeek 性价比最高，硅基流动可作为统一接入层。

---

## 决策 2: 架构模式

**选择**: 服务端代理模式（Server Proxy）

**架构**:
```
Mobile/Web (Expo/Vite)
  → packages/core/src/ai/client.ts (共享客户端)
    → Next.js API Route: /api/ai/*
      → DeepSeek API / 硅基流动 API
```

**理由**:
- API Key 安全：绝不在客户端代码中嵌入密钥
- 可控缓存：AI 响应按内容哈希存储在 PocketBase
- 可控限流：服务端按用户追踪 token 预算
- 跨平台统一：Mobile 和 Web 共享同一代理层
- 国内访问：服务端部署在国内，无需客户端翻墙

**备选方案**:
- 客户端直连: 安全风险高，React Native 中管理密钥困难
- PocketBase Go 扩展: 学习成本高
- 独立 Hono 服务: 增加部署复杂度

---

## 决策 3: 客户端 SDK 方案

**选择**: `openai` npm 包 + 自定义 baseURL

**理由**:
- DeepSeek、通义千问、硅基流动均兼容 OpenAI API 格式
- `openai` 包支持 Node.js 环境（Next.js API Routes）
- React Native 端通过服务端代理，无需直接使用 SDK
- 切换提供商只需修改 baseURL 和 API Key

**实现方式**:
```typescript
// apps/web/src/lib/ai/server.ts (服务端)
import OpenAI from 'openai';

export const aiClient = new OpenAI({
  baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com',
  apiKey: process.env.AI_API_KEY,
});

// packages/core/src/ai/client.ts (客户端共享)
export async function* streamAI(endpoint: string, body: object, signal?: AbortSignal) {
  const res = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  // SSE parsing
}
```

---

## 决策 4: 隐私保护策略

**选择**: 分层隐私方案

**层级**:
1. **用户同意**: 设置中按功能独立开关 "启用 AI 洞察"
2. **数据脱敏**: 发送前移除可识别信息，仅发送聚合/匿名数据
3. **缓存优先**: 相同内容不重复调用 AI，减少数据外传
4. **本地优先**: 基础情绪标签等简单任务使用规则引擎在本地完成

**理由**:
- 应用定位为隐私优先（Shame Free 修行理念）
- 用户数据本地优先存储（SQLite/AsyncStorage/Dexie）
- AI 为增强功能，不应成为数据泄露渠道

---

## 决策 5: 功能优先级与路线图

**Phase 1 (MVP)**:
- 感念总结与洞察（reflection_summary, reflection_insight）
- 基础缓存与配额系统

**Phase 2**:
- 饮食营养分析（food_analysis）
- 习惯洞察建议（habit_insight）

**Phase 3**:
- 语义相似度（semantic_similarity）- 为思路脉络推荐关联感念
- 运动数据分析（exercise_analysis）

---

## 决策 6: 缓存与限流

**缓存**: PocketBase `ai_cache` collection
- Key: `{feature}_{content_hash}`
- TTL: 感念总结 7 天 / 食食分析永久 / 习惯建议 24 小时
- 源数据变更时自动失效

**限流**: 服务端 Token 预算
- 每用户每日 AI 调用上限: 50 次
- 每用户每日 Token 消耗上限: 100K tokens
- 超限时返回友好提示
