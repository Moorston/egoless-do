# Egoless-Do 架构约束

> 模块边界、层间依赖规则、数据流向、禁止架构模式的权威定义
>
> **维护者**: Architecture Review | **审核**: 所有架构变更
> **版本**: 1.0 | **更新**: 2026-07-09

---

## 目录

- [1. 项目全景图](#1-项目全景图)
- [2. 包依赖方向](#2-包依赖方向)
- [3. 层间边界与职责](#3-层间边界与职责)
- [4. 数据流](#4-数据流)
- [5. 模块内聚规则](#5-模块内聚规则)
- [6. Store 契约](#6-store-契约)
- [7. 后端/PocketBase 边界](#7-后端点边界)
- [8. 禁止架构模式黑名单](#8-禁止架构模式黑名单)
- [9. ESLint 规则映射](#9-eslint-规则映射)

---

## 规则格式说明

```
[🔴 MUST | 🟡 SHOULD] [适用范围: core | mobile | api | pb | ALL]
```

---

## 1. 项目全景图

```
┌─────────────────────────────────────────────────────┐
│                    apps/mobile                       │
│  (React Native + Expo + Zustand + SQLite)            │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐ │
│  │ Screens   │  │ Components│  │ Navigation         │ │
│  ├───────────┤  ├───────────┤  ├───────────────────┤ │
│  │ Features  │  │ Store     │  │ Sync Engine        │ │
│  │ (25 mods) │  │ (Zustand) │  │ (WriteBatcher)     │ │
│  └─────┬─────┘  └─────┬─────┘  └────────┬──────────┘ │
│        │              │                  │            │
│        └──────────────┼──────────────────┘            │
│                       │  imports from                  │
│                       ▼  @egoless-do/core              │
│              ┌────────────────────┐                    │
│              │  packages/core     │                    │
│              │  (Pure TS)         │                    │
│              │  ┌──────────────┐  │                    │
│              │  │  types/      │  │  ← 实体类型定义    │
│              │  │  store/      │  │  ← Slice 工厂      │
│              │  │  business/   │  │  ← 纯业务逻辑      │
│              │  │  sync/       │  │  ← 冲突/合并       │
│              │  │  ai/         │  │  ← AI 服务         │
│              │  │  utils/      │  │  ← 工具函数        │
│              │  └──────────────┘  │                    │
│              └────────┬───────────┘                    │
│                       │  REST API                      │
│                       ▼                                │
│              ┌────────────────────┐                    │
│              │  PocketBase        │                    │
│              │  (pb_hooks/)       │                    │
│              └────────────────────┘                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              infra/docker/api                        │
│  (Express.js — 认证 + 业务 API)                       │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐       │
│  │ Auth  │ │ MFA   │ │ RBAC  │ │ Blacklist │       │
│  └───┬───┘ └───────┘ └───────┘ └───────────┘       │
│      │  REST API                                     │
│      ▼                                               │
│  PocketBase (pb_hooks: 同步 + 推送)                   │
└─────────────────────────────────────────────────────┘
```

---

## 2. 包依赖方向

### 2.1 单向依赖

> [🔴 MUST] [ALL]

```
packages/core  ←──  apps/mobile     (core 不感知 mobile 存在)
packages/core  ←──  infra/docker/api(但不推荐，API 应直接调 PocketBase REST)
```

**禁止**:
- `packages/core` 导入 `apps/mobile` 或 `apps/*` 中的任何内容
- `packages/core` 导入 `react`、`react-native`、`expo-*` 等平台库
- `apps/mobile` 绕过 `packages/core` 直接调用 PocketBase REST API（业务操作必须通过 Slice）

### 2.2 包间导出契约

> [🔴 MUST] [core]

`packages/core` 的公开 API 在 `src/index.ts` 中定义。禁止在 `index.ts` 之外导出其他符号。

```typescript
// packages/core/src/index.ts — 所有公开导出的唯一入口
export * from './types';
export * from './store';
export * from './business';
// ... 其他导出
```

### 2.3 跨包类型共享

> [🔴 MUST] [ALL]

任何在两个及以上包之间共享的类型，必须定义在 `packages/core/src/types/` 中。`apps/mobile` 中 `navigation/types.ts` 等 mobile 特有类型除外。

---

## 3. 层间边界与职责

### 3.1 三层架构（packages/core）

> [🔴 MUST] [core]

```
┌──────────────────────────────────────────────────┐
│  Store Layer (store/):                            │
│  - Slice 工厂 (createXxxSlice)                     │
│  - 状态管理 + 持久化协调                            │
│  - 不包含业务逻辑，委托给 business/                  │
├──────────────────────────────────────────────────┤
│  Business Layer (business/):                      │
│  - 纯函数，无副作用，无 I/O                         │
│  - 包含领域规则、计算、校验                          │
│  - 可被 store 和 UI 直接调用                       │
├──────────────────────────────────────────────────┤
│  Utils/Infra Layer (utils/, sync/, data/):        │
│  - 通用工具函数                                    │
│  - 同步协议（冲突解决、合并）                        │
│  - 数据访问抽象（DataGateway 接口）                  │
└──────────────────────────────────────────────────┘
```

**禁止**:
- Slice 工厂中包含业务逻辑 → 应委托给 `business/` 中的纯函数
- `business/` 中调用 `adapter.persistChange` → 持久化是 Store 层职责
- `business/` 中 import `store/` 中的内容 → 单向依赖

### 3.2 移动端分层

> [🔴 MUST] [mobile]

```
┌──────────────────────────────────────────────────┐
│  Screens/Components (UI Layer)                    │
│  - 布局 + 用户交互                                 │
│  - 通过 Store 选择器读取状态                        │
│  - 通过事件处理器调用 Slice Action                  │
│  - 不直接操作 SQLite 或 SyncEngine                 │
├──────────────────────────────────────────────────┤
│  Store (Zustand)                                  │
│  - 组合 core 的 Slice 工厂 + mobile UI Slice       │
│  - 连接 StorageAdapter 实现持久化                   │
│  - 不包含业务逻辑                                  │
├──────────────────────────────────────────────────┤
│  Services (SyncEngine, WriteBatcher, 等)           │
│  - 副作用服务，处理 I/O 和同步                      │
│  - 被 Slice 回调触发，不直接被 UI 调用              │
└──────────────────────────────────────────────────┘
```

**禁止**:
- Screen 中直接调用 `SyncService.runSync()` → 通过 `triggerAutoSync` 回调
- Screen 中直接写入 SQLite → 通过 `adapter.persistChange`
- Screen 中直接设置深层嵌套状态 → 通过 Slice Action

---

## 4. 数据流

### 4.1 写入路径

> [🔴 MUST] [mobile]

```
用户操作 → Screen/Component (事件处理)
              ↓
         Slice Action (在 core 中定义)
              ↓
    ┌─────────┴─────────┐
    ↓                    ↓
  adapter.persistChange   triggerSync() (回调)
    ↓                      ↓
  WriteBatcher (100ms)    SyncEngine
    ↓                      ↓
  SQLite (本地持久化)      PocketBase (远程同步)
```

**关键规则**:
- 所有实体变更必须通过 `adapter.persistChange`，不可绕过
- 同步触发通过回调函数，不直接导入 SyncService
- WriteBatcher 的 100ms debounce 不可在 UI 中手动触发 flush

### 4.2 读取路径

> [🔴 MUST] [mobile]

```
启动 → rehydrateFromDb() → useAppStore.setState(dbPatch)
                                               ↓
                                   UI 通过 useShallow 选择器读取
```

**关键规则**:
- 初始化时 SQLite 数据通过 `rehydrateFromDb` 批量加载到 Zustand store
- 运行期间 UI 通过 `useShallow` 选择器从 Zustand 读取，不直接查询 SQLite
- 状态变更自动触发 React 重渲染，无需手动刷新

### 4.3 同步全路径

> [🔴 MUST] [mobile]

```
本地变更 → WriteBatcher.flush → SyncEngine.push
                                    ↓
                               PocketBase 接收
                                    ↓
                            SyncEngine.pull (定时/手动)
                                    ↓
                           SyncApplyService.applyPatch
                                    ↓
                           useAppStore.setState + rehydrate
```

**关键规则**:
- 禁止在 UI 中直接调用 `SyncEngine.push` 或 `SyncEngine.pull`
- 同步冲突由 `SyncApplyService` 处理，UI 通过 `SyncConflictPanel` 展示

---

## 5. 模块内聚规则

### 5.1 Feature 模块自治

> [🔴 MUST] [mobile]

每个 `features/<name>/` 应自包含：

```
features/<name>/
├── <Name>Screen.tsx      # 主 Screen（默认导出，注册在导航中）
├── components/           # 本 feature 私有组件
├── shared/               # 本 feature 内部共享 hooks/styles
├── layouts/              # 布局变体（exercise 等复杂 feature）
├── pages/                # 子页面（导航至此 feature 的子路由）
└── services/             # 副作用服务（音频、API 等）
```

**禁止**:
- Feature 目录下的 `utils/`、`helpers/`、`misc/`、`temp/` 等通用名称目录
- Feature 之间直接文件引用（共享功能应提升到 `components/` 或 `packages/core`）

### 5.2 跨 Feature 共享规则

> [🟡 SHOULD] [mobile]

| 共享内容 | 存放位置 | 示例 |
|---------|---------|------|
| 跨 feature 复用的 UI 组件 | `apps/mobile/src/components/` | `ErrorBoundary.tsx` |
| 跨 feature 复用的 hooks | 提升到调用方或 `packages/core` | `useAudioCache.ts` |
| 业务类型 | `packages/core/src/types/` | `Habit`, `Reflection` |
| 业务逻辑 | `packages/core/src/business/` | `fasting.ts` |
| Store 状态 | `packages/core/src/store/` | `createHabitSlice.ts` |

---

## 6. Store 契约

### 6.1 Slice 工厂签名

> [🔴 MUST] [core, mobile]

每个 `createXxxSlice` 工厂必须遵循以下签名模式：

```typescript
export function createXxxSlice(
  adapter: StorageAdapter,       // 第一个参数：持久化适配器
  ...callbacks: Array<() => void | ((...) => void)>,  // 后续参数：回调
): SliceCreator<XxxSlice> {
  return (set, get) => ({
    // 状态 + action
  });
}
```

### 6.2 持久化规则

> [🔴 MUST] [core, mobile]

- 所有实体变更（增/删/改）必须调用 `adapter.persistChange(entity, id, data)`
- `persistChange` 调用必须 `.catch(e => log.error(e))` 捕获异常
- 状态变更使用 `set(s => ({ ...s, field: newValue }))` 模式，不可直接修改

### 6.3 同步触发规则

> [🔴 MUST] [core, mobile]

- Slice 中通过 `triggerSync()` 回调触发同步，不直接导入 `SyncService`
- 与同步无关的 UI 状态变更（如 `isModalOpen`）不需要触发同步

### 6.4 Store 读取规则

> [🔴 MUST] [mobile]

- 所有 `useAppStore` 的读取必须使用 `useShallow` 选择器，不可全量订阅
- 选择器应精确选择所需字段，避免选择整个 slice

```typescript
// ✅ 正确
const { theme, language } = useAppStore(useShallow(s => ({
  theme: s.theme,
  language: s.language,
})));

// ❌ 禁止 — 全量订阅
const store = useAppStore();
const theme = store.theme;
```

---

## 7. 后端/PocketBase 边界

### 7.1 职责分离

> [🔴 MUST] [api, pb]

| 组件 | 职责 | 技术栈 |
|------|------|--------|
| `infra/docker/api` | 用户认证、MFA、RBAC、Token 管理 | Express.js |
| `backend/pb_hooks/` | 数据同步、推送通知、业务 Hook | PocketBase JS SDK |
| PocketBase 核心 | 数据存储、关系管理、基础 CRUD | PocketBase |

### 7.2 同步协议约束

> [🔴 MUST] [pb]

- `sync_push_pull.pb.js` 负责处理客户端的 push/pull 请求
- `sync.pb.js` 负责同步相关的数据校验和权限
- 所有同步端点的变更必须与 `packages/core/src/sync/entitySchemas.ts` 中的 Zod schema 保持一致

### 7.3 API 认证协同

> [🔴 MUST] [api, pb]

- `infra/docker/api` 产生的 auth token 必须被 PocketBase hooks 识别
- Token 刷新和黑名单状态在 `infra/docker/api` 和 `backend/pb_hooks/` 之间同步

---

## 8. 禁止架构模式黑名单

以下架构模式在项目中已被识别为危险或已导致过 bug，禁止使用。

### 🔴 P0 — 导致崩溃或数据丢失

| # | 模式 | 说明 | 历史案例 |
|---|------|------|---------|
| 8.1 | **循环导入** | 两个模块互相 import，导致运行时 undefined | `SyncService` ↔ `SyncEngine` 曾在多版本中反复出现循环依赖（`6791c68` 修复） |
| 8.2 | **Slice 回调循环** | Slice A 的 action 触发 Slice B 的变更，B 又触发 A | `ProfileSlice ↔ SettingsSlice` 持久化回调链 |
| 8.3 | **直接 SQLite 写入** | 在 Screen 或 Hook 中绕过 adapter 直接执行 SQL | 导致 ghost data 和持久化不一致 |
| 8.4 | **未捕获的 Promise** | async 操作不 catch，异常静默丢失 | `adapter.persistChange` 未 catch 导致写入失败无感知 |

### 🔴 P1 — 导致状态不一致

| # | 模式 | 说明 | 历史案例 |
|---|------|------|---------|
| 8.5 | **跳过 Slice 直接 setState** | 在 Screen 中用 `useAppStore.setState` 直接修改深层状态 | 绕过 `adapter.persistChange` 导致数据未持久化 |
| 8.6 | **Store 和 SQLite 双写不一致** | 只更新了 Zustand 状态但未调用 `persistChange` | 重启后数据丢失 |
| 8.7 | **手机端直接调 PocketBase API** | 绕过 Slice 和 SyncEngine 直接操作远程数据 | 导致本地状态和远程状态不一致 |

### 🟡 P2 — 降低可维护性

| # | 模式 | 说明 |
|---|------|------|
| 8.8 | **Core 中隐含平台依赖** | 在 `packages/core` 中使用了 `AsyncStorage`、`window` 等 |
| 8.9 | **Feature 间硬编码路由** | 一个 Feature 直接引用另一个 Feature 的导航路径字符串 |
| 8.10 | **共享组件在 Feature 内定义** | 被多个 Feature 使用的组件定义在某个 Feature 的 `components/` 下 |
| 8.11 | **业务逻辑散落在 Screen 中** | 超过 5 行的业务计算直接写在 Screen 组件中，未抽取到 `business/` |
| 8.12 | **直接在 Store 中定义 `any` 类型** | Slice 接口或 action 参数中使用 `any` |

---

## 9. ESLint 规则映射

> 以下架构约束可通过 ESLint 规则自动检测

| 约束条目 | ESLint 规则 | 优先级 | 配置状态 |
|---------|------------|--------|---------|
| 2.1 禁止 core→app 导入 | `no-restricted-imports` | P0 | ❌ 未配置 |
| 2.1 禁止 core→react 导入 | `no-restricted-imports` | P0 | ❌ 未配置 |
| 1.1 any 禁止 | `@typescript-eslint/no-explicit-any` | P0 | ✅ 已配置 |
| 6.4 useShallow 规则 | 自定义规则（建议由 Code Review 检查） | P2 | ❌ 无自动化 |
| 4.1 导入顺序 | `import/order` | P1 | ✅ 已配置 |
| 8.4 未捕获 Promise | `@typescript-eslint/no-floating-promises` | P0 | ❌ 未配置 |
| 函数复杂度 | `max-depth`, `max-lines-per-function` | P1 | ✅ 已配置 |
| 8.12 Slice 中 any | `@typescript-eslint/no-explicit-any` | P0 | ✅ 已配置 |

### 建议新增 ESLint 配置

在 `packages/config/eslint.base.js` 中添加：

```javascript
// 1. 禁止 core→app 和 core→react 的非法跨层导入
'no-restricted-imports': ['error', {
  paths: [{
    name: 'react',
    message: 'packages/core 必须保持平台无关，禁止导入 react',
  }, {
    name: 'react-native',
    message: 'packages/core 必须保持平台无关，禁止导入 react-native',
  }],
  patterns: [{
    group: ['../../apps/*'],
    message: 'packages/core 禁止导入 apps 中的代码',
  }],
}],

// 2. 禁止未捕获的 Promise
'@typescript-eslint/no-floating-promises': 'error',

// 3. 禁止 console.log（强制使用 createLogger）
'no-console': ['error', { allow: ['warn', 'error'] }],
```

---

> **参见**: 
> - `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md`（代码规范）
> - `.claude/rules/architecture.md`（架构概览）
> - `.trellis/spec/mobile/frontend/state-management.md`（状态管理详情）
> - `.trellis/spec/core/backend/directory-structure.md`（Core 目录结构）