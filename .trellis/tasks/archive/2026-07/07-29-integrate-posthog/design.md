# Design: PostHog 产品分析集成

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  Mobile App                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Business    │  │  Navigation  │  │  initApp             │  │
│  │  Hooks       │  │  Container   │  │  (auth subscribe)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                     │
│                ┌─────────────────────┐                          │
│                │  src/analytics/     │                          │
│                │  ├── posthog.ts     │ ← SDK 初始化             │
│                │  ├── track.ts       │ ← 统一埋点 + PII 过滤    │
│                │  ├── privacy.ts     │ ← 匿名化 + 同意管理      │
│                │  └── events.ts      │ ← 事件名常量             │
│                └─────────┬───────────┘                          │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Self-hosted PostHog (Docker)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostHog     │  │  ClickHouse  │  │  Redis               │  │
│  │  (web)       │  │  (events)    │  │  (cache)             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                           │                                     │
│                           │ 同一 Docker 网络                    │
│                           ▼                                     │
│                ┌─────────────────────┐                          │
│                │  PocketBase         │                          │
│                │  (现有)             │                          │
│                └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## 模块设计

### 1. `src/analytics/posthog.ts` — SDK 初始化

```typescript
import PostHog, { PostHogOptions } from 'posthog-react-native';

let posthogInstance: PostHog | null = null;

export interface PostHogConfig {
  apiKey: string;
  host: string;
  sessionReplay?: boolean;
}

export async function initPostHog(config: PostHogConfig): Promise<PostHog | null> {
  // 检查用户同意
  const consent = await getAnalyticsConsent();
  if (consent === 'denied') return null;

  posthogInstance = await PostHog(config.apiKey, {
    host: config.host,
    sessionReplay: config.sessionReplay ?? false,
    captureNativeAppLifecycle: true,
    captureNativeAppEvents: true,
    flushAt: 20,           // 20 事件后批量发送
    flushInterval: 30000,  // 30 秒刷新
  });

  return posthogInstance;
}

export function getPostHog(): PostHog | null {
  return posthogInstance;
}

export async function optIn() {
  await posthogInstance?.optIn();
}

export async function optOut() {
  await posthogInstance?.optOut();
}
```

### 2. `src/analytics/track.ts` — 统一埋点

```typescript
import { getPostHog } from './posthog';
import { sanitize } from './privacy';

// PII 敏感 key 黑名单
const PII_KEYS = new Set([
  'content', 'note', 'mood', 'tags', 'insight', 'gratitude',
  'closing_notes', 'sankalpa', 'trigger_context', 'worst_outcome',
  'email', 'name', 'phone', 'token', 'password',
  'weight', 'body_fat', 'body_weight',  // 健康数据原始值
]);

export function sanitize(props: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.length > 200) continue; // 防泄露长文本
    safe[key] = value;
  }
  return safe;
}

export function track(event: string, props: Record<string, unknown> = {}) {
  const ph = getPostHog();
  if (!ph) return; // 未初始化或用户拒绝
  ph.capture(event, sanitize(props));
}

export function identify(userId: string, properties: Record<string, unknown> = {}) {
  const ph = getPostHog();
  if (!ph) return;
  ph.identify(userId, sanitize(properties));
}

export function screen(screenName: string, props: Record<string, unknown> = {}) {
  const ph = getPostHog();
  if (!ph) return;
  ph.screen(screenName, sanitize(props));
}
```

### 3. `src/analytics/privacy.ts` — 匿名化 + 同意

```typescript
import * as Crypto from 'expo-crypto';

export async function anonymizeUserId(pbUserId: string): Promise<string> {
  const salt = process.env.EXPO_PUBLIC_POSTHOG_SALT || 'default-salt-change-me';
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + pbUserId
  );
  return hash.slice(0, 16); // 截断防逆向
}

export type AnalyticsConsent = 'anonymous' | 'necessary' | 'denied';

export async function getAnalyticsConsent(): Promise<AnalyticsConsent> {
  // 从 SQLite app_state 表读取
  return getState(db, 'analytics_consent') as AnalyticsConsent || 'necessary';
}

export async function setAnalyticsConsent(consent: AnalyticsConsent): Promise<void> {
  await setState(db, 'analytics_consent', consent);
  if (consent === 'denied') {
    await optOut();
  } else if (consent === 'anonymous') {
    await optIn();
  }
}
```

### 4. `src/analytics/events.ts` — 事件常量

```typescript
export const Events = {
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  SCREEN_VIEW: 'screen_view',
  HABIT_CREATED: 'habit_created',
  HABIT_COMPLETED: 'habit_completed',
  HABIT_INTERRUPTED: 'habit_interrupted',
  MEDITATION_STARTED: 'meditation_started',
  MEDITATION_COMPLETED: 'meditation_completed',
  MEDITATION_ABANDONED: 'meditation_abandoned',
  BREATH_COMPLETED: 'breath_session_completed',
  MANTRA_COMPLETED: 'mantra_session_completed',
  ZHIGUAN_COMPLETED: 'zhiguan_session_completed',
  AI_FEATURE_USED: 'ai_feature_used',
  REFLECTION_CREATED: 'reflection_created',
  STREAK_MILESTONE: 'streak_milestone',
  APP_BACKGROUND: 'app_background',
  APP_FOREGROUND: 'app_foreground',
} as const;
```

## 集成点

### App.tsx

```typescript
import { initPostHog } from './src/analytics/posthog';

// initApp() 之后
await initPostHog({
  apiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
});
```

### NavigationContainer

```typescript
import { screen } from './src/analytics/track';

<NavigationContainer
  onStateChange={() => {
    const route = navRef.current?.getCurrentRoute();
    if (!route) return;
    screen(route.name, { previous_screen: prevScreenRef.current });
    prevScreenRef.current = route.name;
  }}
>
```

### initApp auth 订阅（现有代码扩展）

```typescript
// 现有 auth 订阅中加
const _unsubAuth = useAppStore.subscribe(async (state, prevState) => {
  // ... 现有 token 处理 ...

  // PostHog identify
  if (state.auth.user?.id && !prevState.auth.user?.id) {
    const anonId = await anonymizeUserId(state.auth.user.id);
    identify(anonId, {
      guest: state.auth.user.isGuest || false,
      language: state.language,
      theme: state.theme,
    });
  }
});
```

## 自托管部署

### `infra/docker/docker-compose.yml` 扩展

```yaml
services:
  # ... 现有 pocketbase、api ...

  posthog:
    image: posthog/posthog:release-2024-12-18  # 固定版本
    ports:
      - "8000:8000"
    environment:
      POSTHOG_DB_HOST: postgres  # 或共用 PB 的 SQLite（生产不推荐）
      POSTHOG_REDIS_HOST: redis
      POSTHOG_SECRET_KEY: ${POSTHOG_SECRET}
      POSTHOG_API_KEY: ${POSTHOG_API_KEY}
    networks:
      - backend
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    networks:
      - backend

networks:
  backend:
    driver: bridge
```

**注意**: PostHog 官方推荐 ClickHouse，但轻量部署可用 PostgreSQL。

## 隐私合规

### 用户同意 UI

**首次启动弹窗**（`SplashScreen` 后）:
```
"帮助我们改进产品？"

[允许匿名数据] [仅必要功能] [拒绝]

☐ 我们可以发送匿名使用数据来改进应用
☐ 绝不会上传您的冥想笔记、心情记录等敏感内容
```

**设置页开关**（`SettingsScreen`）:
```typescript
<SettingRow
  label="分析数据共享"
  description="发送匿名使用数据帮助改进产品"
  toggle={analyticsConsent === 'anonymous'}
  onToggle={(v) => setAnalyticsConsent(v ? 'anonymous' : 'necessary')}
/>
```

### 隐私政策更新

在 `PRIVACY_POLICY.md` 增加:

```markdown
## 第三方分析服务（PostHog）

为改进产品体验，我们使用自托管的 PostHog 进行匿名使用分析。

**我们收集**:
- 功能使用频率（如"完成冥想"、"创建习惯"）
- 页面浏览路径
- 应用性能数据

**我们不收集**:
- ✗ 您的冥想笔记/感悟内容
- ✗ 心情记录原文
- ✗ 禅修笔记/发愿文字
- ✗ 个人健康数据原始值
- ✗ 邮箱、姓名等身份信息

**数据存储**: 自托管服务器（与 PocketBase 同位置）
**退出机制**: 设置页可随时关闭分析数据共享
```

## 测试策略

### 单元测试

```typescript
// src/analytics/__tests__/track.test.ts
import { sanitize } from '../privacy';

test('sanitize 移除 PII 字段', () => {
  const input = { habit_name: '冥想', content: '内心感悟', email: 'a@b.com' };
  const output = sanitize(input);
  expect(output).toEqual({ habit_name: '冥想' });
  expect(output.content).toBeUndefined();
});

test('sanitize 截断长字符串', () => {
  const input = { note: 'x'.repeat(300) };
  const output = sanitize(input);
  expect(output.note).toBeUndefined();
});
```

### E2E 测试

```typescript
// 验证未同意时不发送事件
test('未同意时 PostHog 不初始化', async () => {
  await setAnalyticsConsent('denied');
  await initPostHog(config);
  expect(getPostHog()).toBeNull();
});
```

## 环境变量

```bash
# .env
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://your-domain.com/posthog
EXPO_PUBLIC_POSTHOG_SALT=your-random-salt-min-32-chars
POSTHOG_SECRET=postgres-secret
```

## 工作量估算

| 阶段 | 内容 | 工时 |
|------|------|------|
| 初始化 | SDK 安装 + posthog.ts + 同意机制 + 设置页 | 4-6 h |
| 路由追踪 | NavigationContainer onStateChange | 1 h |
| 事件埋点 | 17 事件 × 0.5h | 8-10 h |
| 隐私合规 | 隐私政策 + 匿名化 + 同意 UI | 3-4 h |
| 自托管部署 | Docker Compose + Nginx + 备份 | 4-6 h |
| 测试 | 单元 + E2E | 3-4 h |
| **总计** | | **23-31 小时** |

## 风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| PostHog 自托管资源不足 | 中 | 用 Cloud Free 做 MVP |
| PII 泄露 | 低 | sanitize + 代码审查 |
| 用户拒绝率高 | 中 | 清晰说明隐私保护措施 |
| 与 Sentry 冲突 | 低 | 职责分离，互不调用 |

## 回滚计划

1. 移除 `src/analytics/` 目录
2. 移除 `posthog-react-native` 依赖
3. 恢复 `docker-compose.yml`
4. 恢复隐私政策
5. 清除 `app_state.analytics_consent` 配置
