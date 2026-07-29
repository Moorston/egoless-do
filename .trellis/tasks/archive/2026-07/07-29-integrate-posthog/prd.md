# PRD: PostHog 产品分析集成

## 背景
项目缺少产品分析能力，无法追踪用户行为、留存漏斗、功能采用率。Sentry 仅做错误追踪，不覆盖产品分析。

## 需求

### 1. SDK 集成
- **选用**: `posthog-react-native`（官方 RN SDK，~60KB）
- **功能**: 事件追踪、用户识别、Feature Flags、离线队列
- **禁用**: Session Replay（冥想类应用敏感）

### 2. 部署方案
- **选用**: 自托管 Docker Compose（与 PocketBase 同机）
- **位置**: `infra/docker/docker-compose.yml`（扩展现有）
- **硬件基线**: 2 vCPU / 4 GB RAM / 40 GB SSD（<10 万事件/天）

### 3. 事件追踪（17 个核心事件）

| 事件 | 触发 | 属性 |
|------|------|------|
| `user_registered` | 注册成功 | `auth_method`, `is_guest` |
| `user_logged_in` | 登录/恢复会话 | `auth_method` |
| `screen_view` | 导航变化 | `screen_name`, `previous_screen` |
| `habit_created` | 创建习惯 | `habit_category`, `target_days` |
| `habit_completed` | 打卡 | `habit_id_hash`, `streak_day` |
| `meditation_completed` | 冥想完成 | `dur_min_actual`, `completion_type` |
| `reflection_created` | 感念提交 | `word_count_bucket`（**不传 content**）|
| `ai_feature_used` | AI 功能 | `feature`, `model`, `latency_ms` |
| `streak_milestone` | 连续打卡里程碑 | `milestone`, `habit_category` |

### 4. 隐私合规（红线）

**禁止追踪字段**（12 类）:
- `content`, `tags`, `mood`（感念内容）
- `closing_notes`, `sankalpa`（禅修笔记）
- `note`, `gratitude`, `insight`（个人笔记）
- `trigger_context`, `worst_outcome`（心理内容）
- 体重、体脂原始值（健康数据）
- 用户邮箱、姓名（PII）

**匿名化**:
- 用户 ID: SHA-256 加盐哈希（`EXPO_PUBLIC_POSTHOG_SALT`）
- 绝不传 email/name
- IP 掩码（`POSTHOG_IP_MASKING_ENABLED=true`）

**用户同意**:
- 首次启动弹窗（允许匿名 / 仅必要 / 拒绝）
- 设置页开关（optIn/optOut）
- 未同意前 PostHog 不初始化

### 5. 集成点
- `src/analytics/posthog.ts` — SDK 初始化
- `src/analytics/track.ts` — 统一埋点 + PII 过滤
- `navigation/index.tsx` — 路由追踪
- `initApp.ts` — auth 订阅 → identify
- 业务 hooks — 17 个事件埋点

## 验收标准
- [ ] posthog-react-native 安装 + 初始化
- [ ] 自托管 docker-compose 配置（与 PB 同网络）
- [ ] 17 个核心事件埋点
- [ ] PII 过滤函数（`sanitize()`）
- [ ] 用户同意弹窗 + 设置页开关
- [ ] 匿名化工具函数（`anonymizeUserId()`）
- [ ] 隐私政策更新（PostHog 章节）
- [ ] 埋点单元测试
- [ ] 与 Sentry 共存正常

## 影响范围
- 新增: `src/analytics/`、`infra/docker/docker-compose.yml`（扩展）
- 修改: `App.tsx`、`navigation/index.tsx`、业务 hooks
- 不影响: 现有功能、同步协议、数据库 schema

## 工作量
- 初始化 + 同意机制: 4-6 h
- 路由追踪: 1 h
- 事件埋点: 8-10 h
- 隐私合规: 3-4 h
- 自托管部署: 4-6 h
- 测试: 3-4 h
- **总计: 23-31 小时**

## 回滚点
- 移除 `src/analytics/` + posthog 依赖
- 恢复 `docker-compose.yml`
- 恢复隐私政策
