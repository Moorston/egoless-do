# Design: DX + 测试增强

## 1. 文档架构

```
docs/
├── adr/                          ← Architecture Decision Records
│   ├── 001-why-zustand.md        ← 为什么选 Zustand 而非 Redux/Jotai
│   ├── 002-why-pocketbase.md     ← 为什么选 PocketBase 而非 Supabase/Firebase
│   └── 003-why-offline-first.md  ← 为什么离线优先
├── architecture/                 ← 架构文档
│   ├── data-flow.md              ← 数据流图（Mermaid）
│   ├── sync-protocol.md          ← 同步协议详解
│   └── state-management.md       ← 状态管理架构
└── guides/                       ← 开发者指南
    ├── setup.md                  ← 环境搭建
    ├── testing.md                ← 测试指南
    └── architecture.md           ← 架构概览
```

### ADR 模板

```markdown
# ADR-001: 为什么选 Zustand

## 状态
已接受

## 背景
需要为 React Native 应用选择状态管理库。

## 决策
使用 Zustand。

## 理由
- 轻量（~3KB）
- TypeScript 友好
- 无 boilerplate
- 与 SQLite 持久化层配合良好

## 后果
- ✅ 开发效率高
- ✅ 包体积小
- ⚠️ 无 Redux DevTools 深度集成
```

---

## 2. 工具配置

### Plop.js 生成器

```javascript
// plopfile.js
module.exports = function (plop) {
  // Slice 生成器
  plop.setGenerator('slice', {
    description: 'Create a new Zustand slice',
    prompts: [{ type: 'name', name: 'name', message: 'Slice name (e.g. habit):' }],
    actions: [
      {
        type: 'add',
        path: 'packages/core/src/store/create{{pascalCase name}}Slice.ts',
        templateFile: 'templates/slice.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/store/create{{pascalCase name}}Slice.test.ts',
        templateFile: 'templates/slice.test.hbs',
      },
    ],
  });

  // Screen 生成器
  plop.setGenerator('screen', {
    description: 'Create a new screen',
    prompts: [{ type: 'name', name: 'name', message: 'Screen name (e.g. HabitDetail):' }],
    actions: [
      {
        type: 'add',
        path: 'apps/mobile/src/features/{{kebabCase name}}/{{pascalCase name}}Screen.tsx',
        templateFile: 'templates/screen.hbs',
      },
    ],
  });
};
```

### Husky + lint-staged

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## 3. 监控配置

### PostHog 性能事件

```typescript
// src/performance/track.ts
export function trackAppStart(durationMs: number) {
  track('app_start_time', {
    duration_ms: durationMs,
    p50: durationMs, // 实际应从 PostHog 聚合获取
  });
}

export function trackListFPS(fps: number, screenName: string) {
  track('list_fps', { fps, screen: screenName });
}

export function trackSyncLatency(durationMs: number) {
  track('sync_latency', { duration_ms: durationMs });
}
```

### 告警规则（PostHog）

```
- app_start_time P95 > 1000ms → Slack #alerts
- error_rate > 1% → email to team
```

---

## 4. 测试提升

### 覆盖策略

| 层级 | 当前 | 目标 | 策略 |
|------|------|------|------|
| 单元 | 1832 | 2500 | 补充 business/、store/、sync/ 测试 |
| 集成 | 8 | 20 | 覆盖核心流程（登录、冥想、习惯、同步）|
| E2E | 5 | 15 | Maestro 主流程 |

### 性能基准

```typescript
// __tests__/performance/startup.bench.ts
test('startup time < 500ms', async () => {
  const t0 = performance.now();
  await initApp();
  const duration = performance.now() - t0;
  expect(duration).toBeLessThan(500);
});
```

---

## 执行计划

### Week 1（文档 + 工具）
- Day 1-3：ADR + 架构文档 + 开发者指南
- Day 4-5：Plop 生成器 + Husky 配置

### Week 2（监控 + 测试）
- Day 6-7：PostHog 性能事件 + 告警
- Day 8-10：补充单元测试（+600）

### Week 3（测试 + E2E）
- Day 11-12：集成测试（+12）+ E2E（+10）
- Day 13-15：性能基准测试 + 文档完善

---

## 验证

```bash
# 文档
ls docs/adr/ docs/architecture/ docs/guides/

# 工具
npx plop slice test-slice
git commit -m "test: verify husky"  # 应触发 lint-staged

# 测试
npx vitest run --coverage  # 覆盖率 ≥ 90%

# 监控
# PostHog 面板查看 app_start_time 事件
```
