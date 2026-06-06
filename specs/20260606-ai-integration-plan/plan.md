# Implementation Plan: AI 集成

**Branch**: `20260606-ai-integration-plan` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/20260606-ai-integration-plan/spec.md`

## Summary

为 egoless-do（心流纪）接入国内大模型 AI 能力，采用 DeepSeek 作为主力模型、Next.js API Routes 作为代理层、PocketBase 作为缓存存储。分阶段实施：Phase 1 实现感念总结与洞察（MVP），Phase 2 扩展饮食分析与习惯洞察，Phase 3 实现语义相似度与运动分析。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+

**Primary Dependencies**:
- `openai` npm 包（用于调用 DeepSeek/通义千问等 OpenAI 兼容 API）
- 现有: React 18, React Native (Expo SDK 54), Next.js 15, Zustand, PocketBase

**Storage**: PocketBase (SQLite) - 新增 `ai_cache` 和 `ai_usage` collections

**Testing**: Vitest (单元测试), Playwright (E2E)

**Target Platform**: iOS/Android (React Native Expo) + Web (Next.js 15)

**Performance Goals**:
- AI 响应延迟 < 5s（流式首字 < 1s）
- 缓存命中率 > 60%
- 每用户每日 API 成本 < ¥0.5

**Constraints**:
- API Key 仅存在于服务端环境变量，绝不暴露给客户端
- 用户必须明确同意才能启用 AI 功能
- 离线时展示缓存的 AI 结果
- 国内网络环境，无需翻墙即可访问 AI 服务

**Scale/Scope**: 个人项目，单用户为主，预留多用户扩展

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

项目 Constitution 为模板状态（未填写具体内容），无特定约束需要检查。

**通用质量门**:
- [x] 代码安全性: API Key 不暴露给客户端
- [x] 隐私保护: 用户数据需明确同意才能发送至 AI
- [x] 跨平台兼容: 方案同时支持 Mobile 和 Web
- [x] 离线友好: 缓存机制确保离线可查看历史 AI 结果

## Project Structure

### Documentation (this feature)

```text
specs/20260606-ai-integration-plan/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output - AI provider research
├── data-model.md        # Phase 1 output - Data model design
├── quickstart.md        # Phase 1 output - Validation guide
└── contracts/
    └── api.md           # Phase 1 output - API contracts
```

### Source Code (repository root)

```text
packages/core/src/
├── ai/
│   ├── client.ts        # 共享 AI 客户端（fetch + SSE）
│   ├── types.ts         # AI 相关类型定义
│   └── prompts.ts       # Prompt 模板管理

apps/web/src/
├── app/api/ai/
│   ├── reflection/
│   │   ├── summary/route.ts    # 感念总结端点
│   │   └── insight/route.ts    # 感念洞察端点
│   ├── food/
│   │   └── analyze/route.ts    # 饮食分析端点
│   ├── habit/
│   │   └── insight/route.ts    # 习惯洞察端点
│   └── quota/route.ts          # 配额查询端点
├── lib/ai/
│   ├── provider.ts      # AI 提供商配置
│   ├── cache.ts         # 缓存逻辑
│   └── quota.ts         # 配额管理

apps/mobile/src/
├── features/reflections/
│   └── components/
│       └── AiInsightCard.tsx    # AI 洞察展示卡片
```

**Structure Decision**: 采用 monorepo 现有结构。AI 客户端共享逻辑放在 `packages/core`，服务端代理在 `apps/web/src/app/api/ai/`，移动端 UI 组件在对应 feature 目录下。

## Complexity Tracking

> 无 Constitution 违规需要记录
