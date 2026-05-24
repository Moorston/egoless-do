# 心流纪 · Egoless Do

Egoless Do (心流纪) 是一款跨平台间歇性禁食 + 正念修行 + 运动习惯 + 思维记录的综合身心成长应用。它帮助用户养成健康饮食、规律冥想/修行、户外运动习惯，同时随时捕捉内心感悟与灵感，实现身、心、思全面提升

> 离线优先 · 隐私优先 · 多平台习惯追踪与感念记录应用

## 平台支持

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| 📱 iOS | React Native + Expo SDK 54 | ✅ MVP |
| 🤖 Android | React Native + Expo SDK 54 | ✅ MVP |
| 🌐 Web PWA | Next.js 15 + PocketBase | ✅ MVP |

## 功能模块

- **今日打卡** — 连胜系统 + 1天宽限期，习惯打卡联动
- **禁食计时** — 实时倒计时，8–24小时可选，离线安全
- **冥想打坐** — 倒计时 + 环境音，累计分钟统计
- **感念脉络** — 渐变卡片 + 标签时间轴，可分享
- **锻炼追踪** — GPS 跑步轨迹（OpenStreetMap，免费无限制）
- **习惯管理** — 状态流转 + 打卡日历 + 进度可视化
- **全球脉动** — 匿名打卡地图（坐标模糊 ±500m）
- **数据统计** — 本地图表，无需联网
- **饮食记录** — 快速录入 + 热量估算
- **多语言** — 15种语言支持 (zh/en/es/ja/ko/fr/de/pt/ru/ar/it/hi/vi/th)
- **6套主题** — 深色/浅色/深海/森林/玫瑰/星空

## 技术架构

```
egoless-do/ (Turborepo + pnpm workspaces)
├── apps/
│   ├── mobile/             # React Native + Expo (iOS/Android)
│   └── web/                # Next.js 15 PWA
├── packages/
│   ├── core/               # 共享类型 + 常量 + i18n + store + auth
│   ├── ui/                 # 共享 UI 组件
│   └── config/             # ESLint + TypeScript 配置
├── pocketbase/             # Windows 开发实例 (二进制 + 迁移)
│   ├── pb_migrations/      # 数据库迁移
│   ├── pb_data/            # SQLite 数据文件 (gitignored)
│   └── setup.ps1           # Windows 一键设置
└── backend/                # 服务端部署配置 (Docker + hooks)
    ├── docker-compose.yml  # PocketBase + Cloudflare Tunnel
    ├── pb_hooks/           # 服务端 JS hooks
    └── pb_schema.json      # 集合 schema 定义
```

## 数据同步

Web 端通过 `/api/sync` 路由与 PocketBase 双向同步，使用 7 个按实体划分的集合：

| 集合 | 标识字段 | 说明 |
|------|---------|------|
| `habits` | `habit_id` | 习惯定义与进度 |
| `reflections` | `reflection_id` | 感念内容 |
| `fasting_sessions` | `session_id` | 禁食记录 |
| `food_entries` | `food_id` | 饮食日志 |
| `checkin_records` | `date` | 每日打卡 |
| `meditation_history` | `date` | 冥想记录 |
| `user_profiles` | `profile_id` | 用户资料 |

权限规则：用户仅可读写自己的数据（`@request.auth.id = user_id`）。

## 月度运营成本

| 项目 | 方案 | 月成本 |
|------|------|--------|
| 后端 | 甲骨文永久免费 ARM VPS | ¥0 |
| Web 托管 | Vercel 免费计划 | ¥0 |
| 文件存储 | Cloudflare R2（10GB内） | ¥0 |
| CDN | Cloudflare 免费计划 | ¥0 |
| 邮件 | Resend（3000封/月） | ¥0 |
| 地图瓦片 | OpenStreetMap | ¥0 |
| CI/CD | GitHub Actions | ¥0 |
| **合计** | | **¥0 / 月** |

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
```

### 后端 (PocketBase)

**Windows 开发：**

```bash
# 首次设置 (自动创建 admin + 示例用户)
pnpm pb:setup

# 启动 PocketBase (http://localhost:8090)
pnpm pb

# Admin UI: http://localhost:8090/_/
# admin@egoless.do/admin123456
```

**Linux / Docker 部署：**

```bash
cd backend
cp .env.example .env  # 填写 CLIENT_URL 等配置
docker compose up -d
```

## 隐私承诺

- 感念内容默认不离开设备
- GPS 坐标上传前模糊处理（±500m）
- 不依赖第三方广告 SDK
- PocketBase 完全自托管，数据自主可控

详见 [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## License

MIT © 2026 Egoless Do Team
