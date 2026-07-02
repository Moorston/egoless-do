<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
- **Plan**: [specs/001-global-pulse-improvement/plan.md](specs/001-global-pulse-improvement/plan.md)
- **API Contracts**: [specs/001-global-pulse-improvement/contracts/api.md](specs/001-global-pulse-improvement/contracts/api.md)
- **Data Model**: [specs/001-global-pulse-improvement/data-model.md](specs/001-global-pulse-improvement/data-model.md)
- **Research**: [specs/001-global-pulse-improvement/research.md](specs/001-global-pulse-improvement/research.md)
<!-- SPECKIT END -->

## 项目架构（2026-07 重构后）

### 目录结构

```
egoless-do/ (Turborepo + pnpm workspaces)
├── apps/
│   ├── mobile/                    # React Native + Expo (iOS/Android)
│   │   └── src/
│   │       ├── features/          # 25 个功能模块（各自为政，保留 features/ 范式）
│   │       ├── components/        # 跨 feature 通用组件
│   │       ├── db/                # SQLite schema + syncQueue
│   │       ├── store/             # Zustand store (mobile 专属)
│   │       ├── net/               # 网络层工具 (offlineAware)
│   │       ├── shared/            # mobile 共享 UI 组件 (Button/Card/Modal/ThemeProvider)
│   │       └── navigation/        # 导航配置
│   └── web/                       # Next.js 15 PWA (deprecated)
├── packages/
│   ├── core/                      # 共享业务逻辑（平台无关）
│   │   ├── ai/                    # AI 服务 + RAG
│   │   ├── business/              # 纯业务函数
│   │   ├── store/                 # 37 个 Zustand slice
│   │   ├── sync/                  # 同步协议
│   │   ├── i18n/                  # 国际化
│   │   ├── types/                 # 共享类型
│   │   ├── constants/             # 常量
│   │   ├── data/                  # 数据网关接口
│   │   └── utils/                 # 工具函数
│   └── config/                    # ESLint + TypeScript 配置
├── backend/                       # PocketBase 后端（唯一位置）
│   ├── pb_hooks/                  # 服务端 JS hooks
│   ├── pb_migrations/             # 数据库迁移脚本
│   └── pb_schema.json             # schema 定义
├── infra/                         # 部署和运维文件
│   ├── docker/                    # 生产配置 (docker-compose.yml, Dockerfile.web)
│   ├── nginx/                     # 反向代理配置
│   └── scripts/                   # 运维脚本 (deploy.sh, backup-pb.sh, restore-pb.sh)
└── openspec/                      # 架构决策记录
```

### 核心原则

1. **core 是 sole source of truth**：业务逻辑、类型、常量、纯函数只放 core
2. **apps 是壳**：只放 app-specific 的 UI、导航、平台适配
3. **infra 是运维**：部署、数据库、脚本
4. **移动优于复制**：宁可 git mv 也不要留副本

### 判断"该放哪"的决策树

```
这个文件是业务逻辑吗？
├── 是 → packages/core/src/business/ 或 domain/
└── 否 → 它是 UI 组件吗？
         ├── 是 → 跨 app 共享吗？
         │        ├── 是 → packages/core/src/ui/（仅纯 UI 原子）
         │        └── 否 → apps/<app>/components/ 或 features/<name>/components/
         └── 否 → 它是类型吗？
                  ├── 是 → packages/core/src/types/
                  └── 否 → 它是配置/常量吗？
                           ├── 是 → packages/core/src/constants/
                           └── 否 → 它是工具函数吗？
                                    ├── 是 → packages/core/src/utils/
                                    └── 否 → 重新评估，可能是设计问题
```

### 已知技术债务

- `packages/core/src/i18n/*.ts` — 存在重复键（TS1117 错误），待修复
- `apps/web/` — deprecated，待归档
- `apps/mobile/src/features/reflections/` — 7 个子目录，复杂度高，待解体
- 5 个测试失败（预先存在），待修复
