# 心流纪 · Egoless Do

跨平台正念修行 + 习惯追踪 + 思维记录综合应用。帮助用户养成健康饮食、规律冥想、运动习惯，同时捕捉内心感悟，实现身、心、思全面提升。

> 离线优先 · 隐私优先 · 多端同步 · 零月费运营

## 平台支持

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| iOS | React Native + Expo SDK 54 | ✅ MVP |
| Android | React Native + Expo SDK 54 | ✅ MVP |
| Web PWA | Next.js 15 + PocketBase | ✅ MVP |

## 功能模块

| 模块 | 说明 |
|------|------|
| **今日打卡** | 连胜系统 + 宽限期机制，习惯打卡联动 |
| **禁食计时** | 实时倒计时，8–24 小时可选，离线安全 |
| **冥想打坐** | 倒计时 + 环境音，累计分钟统计 |
| **感念脉络** | 渐变卡片 + 标签时间轴 + 思维脉络（Trail）系统 |
| **锻炼追踪** | GPS 轨迹（OpenStreetMap），多运动类型支持 |
| **习惯管理** | 状态流转 + 打卡日历 + 闹钟提醒 + 进度可视化 |
| **计划系统** | 多阶段计划 + 每日任务 + 频率配置 + 进度追踪 |
| **AI 洞察** | 本地 RAG 检索 + 云端 AI 分析，风险预警 + 个性化建议 |
| **全球脉动** | 匿名打卡地图（坐标模糊 ±500m），SSE 实时推送 |
| **饮食记录** | 快速录入 + 热量估算 + 自定义预设 |
| **音乐播放** | 冥想环境音 + 本地音乐导入 |
| **健康集成** | Apple HealthKit / Health Connect 步数 + 体重同步 |
| **数据统计** | 本地图表，无需联网 |
| **多语言** | 中文简体 / 中文繁體 / English |
| **多主题** | 深色 / 浅色 / 深海 / 森林 / 玫瑰 / 星空 |

## 技术架构

```
egoless-do/ (Turborepo + pnpm workspaces)
├── apps/
│   ├── mobile/                    # React Native + Expo (iOS/Android)
│   │   └── src/
│   │       ├── features/          # 25 个功能模块
│   │       ├── components/        # 通用组件 (UI/ErrorBoundary/SyncBanner)
│   │       ├── db/                # SQLite schema + syncQueue + 迁移
│   │       ├── store/             # Zustand store (含 useNetworkStatus)
│   │       ├── net/               # 网络层工具 (offlineAware)
│   │       ├── i18n/              # 国际化初始化 (i18next)
│   │       ├── hooks/             # 跨 feature hooks
│   │       └── navigation/        # 导航配置
│   └── web/                       # Next.js 15 PWA
│       └── src/app/api/           # 服务端 API 路由
├── packages/
│   ├── core/                      # 共享业务逻辑（平台无关）
│   │   ├── ai/                    # AI 服务 + RAG + 风险预警 + 思维推荐
│   │   ├── business/              # 纯业务函数 (习惯/打卡/禁食/计划/dateUtils/...)
│   │   ├── store/                 # 37 个 Zustand slice
│   │   ├── sync/                  # 同步协议 (entities/conflict/merge)
│   │   ├── i18n/                  # 国际化 (zh/en/zh-Hant)
│   │   ├── types/                 # 共享类型定义
│   │   ├── constants/             # 常量 (THEMES/COLORS/...)
│   │   ├── data/                  # 数据网关接口 (DataGateway)
│   │   └── utils/                 # 工具函数
│   └── config/                    # ESLint + TypeScript 配置
├── backend/                       # PocketBase 后端（唯一位置）
│   ├── pb_hooks/                  # 服务端 JS hooks
│   ├── pb_migrations/             # 数据库迁移脚本
│   ├── pb_data/                   # 运行时数据（gitignore）
│   ├── pb_schema.json             # schema 定义
│   ├── docker-compose.yml         # 开发配置（Cloudflare Tunnel）
│   └── setup.ps1                  # 安装脚本
├── infra/                         # 部署和运维文件
│   ├── docker/                    # 生产配置
│   │   ├── docker-compose.yml
│   │   └── Dockerfile.web
│   ├── nginx/                     # 反向代理配置
│   │   └── nginx.conf
│   └── scripts/                   # 运维脚本
│       ├── deploy.sh
│       ├── backup-pb.sh
│       └── restore-pb.sh
└── openspec/                      # 架构决策记录
    └── changes/restructure-codebase/
```

## 数据同步架构

```
┌─────────────────────────────────────────────────────────────┐
│                     客户端 (React Native / Web)              │
│                                                             │
│  Zustand Store ◄── SyncEngine ──► SQLite (expo-sqlite)      │
│                      │                                      │
│              ┌───────┼────────┐                              │
│              │ SSE 实时推送   │ 短轮询 (自适应 60-300s)       │
│              │ RealtimeAgent │ apiSyncCheck → apiSyncPull    │
│              └───────┬────────┘                              │
│                      │                                      │
│              Change Queue (SQLite)                           │
│              drainQueue → apiSyncPush (50/批, 最多10批)      │
└──────────────────────┼──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PocketBase (自托管, ARM VPS)                     │
│                                                             │
│  sync.pb.js:                                               │
│    GET  /api/sync          — 增量/全量拉取                   │
│    GET  /api/sync/check    — 轻量变更检测                    │
│    POST /api/sync          — 推送 + 拉取合并                 │
│    GET  /api/sync/pull/:e  — 分页按实体拉取                  │
│    GET  /api/sync/reconcile — 一致性快照                     │
│                                                             │
│  冲突规则: LWW (Last-Writer-Wins)                            │
│    未删除: 时间戳大者胜, 平局 → 服务端胜                      │
│    已删除: 时间戳大者胜, 平局 → 删除方胜                      │
│                                                             │
│  安全: JWT auth + epoch 踢出 + input validation              │
└─────────────────────────────────────────────────────────────┘
```

**19 个同步实体:**

| 集合 | 标识字段 | 说明 |
|------|---------|------|
| `habits` | `habit_id` | 习惯定义与进度 |
| `reflections` | `reflection_id` | 感念内容 |
| `fasting_sessions` | `session_id` | 禁食记录 |
| `food_entries` | `food_id` | 饮食记录 |
| `checkin_records` | `date` | 每日打卡 |
| `meditation_history` | `date` | 冥想记录 |
| `user_profiles` | `profile_id` | 用户资料 |
| `exercise_entries` | `exercise_id` | 运动记录 |
| `plans` | `plan_id` | 计划定义 |
| `plan_items` | `plan_item_id` | 计划项目 |
| `plan_item_checkins` | `checkin_id` | 计划打卡 |
| `daily_custom_todos` | `todo_id` | 每日自定义任务 |
| `daily_todo_history` | `history_id` | 任务历史 |
| `grace_history` | `date` | 宽限期记录 |
| `thought_trails` | `trail_id` | 思维脉络 |
| `trail_notes` | `note_id` | 脉络笔记 |
| `reflection_links` | `link_id` | 感念关联 |
| `ai_configs` | `config_id` | AI 配置 |
| `checkin_reviews` | `review_id` | 打卡回顾 |

## 快速开始

```bash
# 安装依赖
pnpm install

# Web 开发 (http://localhost:3000)
pnpm web

# 移动端开发
pnpm mobile           # Expo Go 预览
pnpm mobile:android   # Android 模拟器
pnpm mobile:ios       # iOS 模拟器 (macOS)

# 类型检查
pnpm type-check

# 测试
pnpm test
pnpm test:watch
pnpm test:coverage
```

### 后端 (PocketBase)

**Windows 开发:**

```bash
# 首次设置 (自动创建 admin + 示例用户)
pnpm pb:setup

# 启动 PocketBase (http://localhost:8090)
pnpm pb

# Admin UI: http://localhost:8090/_/
```

**Linux / Docker 部署:**

```bash
cp .env.example .env  # 填写配置
docker compose -f infra/docker/docker-compose.yml up -d
```

## 测试覆盖

27 个测试文件，覆盖核心业务逻辑:

```
__tests__/
├── sync/           SyncService, syncQueue, conflict
├── store/          checkinSlice, habitSlice, uiStore
├── integration/    sync-flow 端到端
├── components/     Button 组件
└── realtime/       activeSessionApi

packages/core/src/
├── business/       10 个业务模块测试
├── sync/           conflict, merge, entitySchemas
├── store/          thoughtTrail, trailNote slices
└── utils.test.ts
```

## 月度运营成本

| 项目 | 方案 | 月成本 |
|------|------|--------|
| 后端 | 甲骨文永久免费 ARM VPS | ¥0 |
| Web 托管 | Vercel 免费计划 | ¥0 |
| 文件存储 | Cloudflare R2（10GB 内） | ¥0 |
| CDN | Cloudflare 免费计划 | ¥0 |
| 邮件 | Resend（3000 封/月） | ¥0 |
| 地图瓦片 | OpenStreetMap | ¥0 |
| CI/CD | GitHub Actions | ¥0 |
| **合计** | | **¥0 / 月** |

## 隐私承诺

- 感念内容默认不离开设备
- GPS 坐标上传前模糊处理（±500m）
- 不依赖第三方广告 SDK
- PocketBase 完全自托管，数据自主可控

详见 [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## License

MIT © 2026 Egoless Do Team
