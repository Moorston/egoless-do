## Goal

把项目从"有机生长 8 个 feature 后的混沌状态"迁移到"看一眼就知道代码该放哪"的清爽架构。不改变任何业务行为。

## Architecture

### 当前架构（问题）

```
egoless-do/
├── package/dist/          ← 垃圾
├── pocketbase/            ← 与 backend/ 双轨
├── backend/               ← 与 pocketbase/ 重叠
├── nginx/                 ← 部署文件散乱
├── scripts/               ← 同上
├── Dockerfile.web         ← 同上
├── docker-compose.yml     ← 同上
├── assets/                ← 资源位置错误
├── apps/mobile/src/
│   ├── components/        ← 归属地 1
│   ├── shared/components/ ← 归属地 2
│   ├── features/shared/   ← 归属地 3
│   ├── features/ (25 个，各自为政)
│   │   ├── reflections/   ← 7 子目录
│   │   ├── exercise/      ← 4 子目录
│   │   ├── home/          ← components/screens/utils
│   │   └── ...
│   ├── data/              ← 与 core 重复
│   ├── infra/             ← 3 个文件，过度设计
│   ├── i18n/              ← 与 core 重复
│   └── store/             ← 与 core 边界模糊
├── apps/web/src/
│   └── components/charts/ ← 与 mobile 重复
└── packages/core/src/
    ├── ui/                ← ★ 新位置
    ├── domain/            ← ★ 新位置
    └── ... (已清爽)
```

### 目标架构

```
egoless-do/
├── infra/                       ← ★ 新归类
│   ├── docker/
│   │   ├── Dockerfile.web
│   │   └── docker-compose.yml
│   ├── nginx/
│   │   └── nginx.conf
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── backup-pb.sh
│   │   └── restore-pb.sh
│   └── pocketbase/              ← ★ 合并后的 PocketBase
│       ├── migrations/          ← 原 backend/pb_migrations
│       ├── hooks/               ← 原 backend/pb_hooks
│       └── schema.json          ← 原 backend/pb_schema.json
│
├── apps/
│   ├── mobile/
│   │   ├── app/                 ← 未来的方向（本次不动）
│   │   ├── features/            ← 保留（用户决策 #3）
│   │   │   └── <name>/          ← 本次不统一模板
│   │   ├── components/          ← 仅跨 feature 通用 UI
│   │   ├── hooks/               ← 仅跨 feature 通用 hooks
│   │   ├── stores/              ← 仅 mobile 专属 UI store
│   │   └── db/                  ← 数据库层（接收 infra 迁来的文件）
│   │
│   └── web/
│       └── src/
│           ├── app/             ← Next.js app router
│           ├── components/      ← 页面/UI（移除 charts）
│           └── lib/             ← 客户端工具
│
├── packages/
│   ├── core/
│   │   ├── ui/                  ← ★ 新位置：共享 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── charts/          ← 合并 mobile+web 图表
│   │   │   └── theme/
│   │   ├── domain/              ← ★ 新位置：业务服务
│   │   │   ├── notifications/
│   │   │   ├── health/
│   │   │   ├── music/
│   │   │   └── globalPulse/
│   │   ├── business/            ← 业务逻辑（已有，迁入更多）
│   │   ├── store/               ← Zustand slices（已有）
│   │   ├── sync/                ← 同步引擎（已有）
│   │   ├── ai/                  ← AI/LLM/RAG（已有）
│   │   ├── i18n/                ← 翻译（已有）
│   │   ├── types/               ← 类型（已有，迁入更多）
│   │   ├── constants/           ← 常量（已有）
│   │   ├── data/                ← 数据网关（已有，合并 MobileDataGateway）
│   │   └── utils/               ← 工具（已有，迁入更多）
│   │
│   └── config/                  ← eslint/tsconfig（保持）
│
├── docs/                        ← 未来的方向（本次不动）
└── tests/                       ← 未来的方向（本次不动）
```

## Principles

### 核心原则

1. **core 是 sole source of truth**：业务逻辑、类型、常量、共享 UI 只放 core
2. **apps 是壳**：只放 app-specific 的 UI、导航、平台适配
3. **infra 是运维**：部署、数据库、脚本
4. **移动优于复制**：宁可 git mv 也不要留副本
5. **一次一个 Phase**：每完成一个 Phase 做一次 commit，可独立回滚

### 判断"该放哪"的决策树

```
这个文件是业务逻辑吗？
├── 是 → packages/core/src/business/ 或 domain/
└── 否 → 它是 UI 组件吗？
         ├── 是 → 跨 app 共享吗？
         │        ├── 是 → packages/core/src/ui/
         │        └── 否 → apps/<app>/components/ 或 features/<name>/components/
         └── 否 → 它是类型吗？
                  ├── 是 → packages/core/src/types/
                  └── 否 → 它是配置/常量吗？
                           ├── 是 → packages/core/src/constants/
                           └── 否 → 它是工具函数吗？
                                    ├── 是 → packages/core/src/utils/
                                    └── 否 → 重新评估，可能是设计问题
```

### core/ui 的边界

**放 core/ui**：
- 基础 UI 原子（Button, Input, Modal, Card, Drawer, List）
- 图表组件（BarChart, LineChart, HeatmapGrid, CalendarGrid）
- 主题系统（ThemeProvider, useTheme）

**不放 core/ui**：
- 业务组件（MalaRing, WuxingRadarChart, SankalpaCard）→ 留 features/
- 页面组件（HomeScreen, ZhiguanScreen）→ 留 features/ 或 app/
- 业务特定的布局（ExerciseLayout, MeditationActive）→ 留 features/

### core/domain 的边界

**放 core/domain**：
- 通知服务（NotificationService）
- 健康服务（HealthService）
- 音乐播放服务
- Global Pulse API 客户端
- 任何与外部系统交互的服务

**不放 core/domain**：
- 业务纯计算 → core/business/
- 状态管理 → core/store/
- 平台特定实现 → apps/<app>/

## Trade-offs

### 选择 A：激进重构（本次不做）
- 一次性迁移所有文件
- 风险：巨大 PR，难以 review，难以回滚
- 收益：一步到位

### 选择 B：渐进重构（本次选择）
- 分 5 个 Phase，每 Phase 独立 commit
- 风险：过渡期存在"新旧并存"的混乱
- 收益：可控、可回滚、可中断

### 选择 C：仅做 P0（最小化）
- 只删除垃圾 + 合并 backend
- 收益：1 小时完成，零风险
- 收益：不解决核心问题（组件归属、feature 混乱）

## Non-Goals

- ❌ 不改业务行为
- ❌ 不迁移 features/ → app/（用户决策 #3）
- ❌ 不统一 feature 模板（留后续 change）
- ❌ 不处理 web deprecated（用户决策 #1）
- ❌ 不解体 reflections/（用户决策 #4）
- ❌ 不引入新依赖
- ❌ 不改变 core 的对外 API（保持现有 exports 不变）
