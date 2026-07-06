# Architecture Rules & Boundaries

> 自动生成于 2026-07-06，基于知识图谱分析

## 1. 分层规则

### 1.1 依赖方向（单向）

```
mobile ──▶ core     ✅ 允许（通过 import type + 参数注入）
core   ──▶ mobile   ⚠️ 仅允许运行时多态（通过接口注入）
trellis ──▶ core    ✅ 允许（工具链依赖业务层）
trellis ──▶ mobile  ⚠️ 最小化（仅限 build 脚本）
backend ──▶ core    ✅ 允许（pb_hooks 依赖核心包）
```

### 1.2 接口所有权规则

- **core 拥有所有抽象接口**（StorageAdapter, DataGateway, etc.）
- **mobile/web 提供具体实现**
- **core 永远不 import mobile 的具体实现类型**
- core slice 通过函数参数接收 adapter，不通过全局 import

### 1.3 跨层通信

| 通信方式 | 允许 | 示例 |
|----------|------|------|
| core 接口 + mobile 实现 | ✅ | StorageAdapter |
| core 类型 + mobile 组件 | ✅ | Theme, I18nKey |
| mobile 直接 import core 实现 | ✅ | constants, utils, business |
| core 直接 import mobile 实现 | ❌ | 违反 DIP |

---

## 2. 文件大小约束

### 2.1 组件（.tsx）

| 指标 | 软限制 | 硬限制 | 当前违规 |
|------|--------|--------|---------|
| 单文件行数 | 400 | 600 | 15 个文件 > 500 行 |
| 单函数行数 | 300 | 500 | 15 个函数 > 500 行 |
| 认知复杂度 | 30 | 50 | 5 个函数 > 50 |
| 圈复杂度 | 20 | 30 | 多个函数 > 30 |

### 2.2 Store Slice（.ts）

| 指标 | 软限制 | 硬限制 | 当前违规 |
|------|--------|--------|---------|
| 单 slice 行数 | 400 | 600 | createPlanSlice 1202 行 |
| 单 slice 方法数 | 15 | 20 | createPlanSlice 28 个方法 |
| 单方法认知复杂度 | 30 | 50 | createAuthSlice.pullServerData 108 |

### 2.3 Hook（.ts）

| 指标 | 软限制 | 硬限制 | 当前违规 |
|------|--------|--------|---------|
| 单 hook 行数 | 200 | 400 | useQuickTrailSearch 515 行 |
| 认知复杂度 | 30 | 50 | useQuickTrailSearch 174 |

---

## 3. 模块边界规则

### 3.1 Feature 模块结构

```
features/<name>/
├── components/     ← 纯 UI 组件（无业务逻辑）
├── hooks/          ← 自定义 hooks（业务逻辑 + 状态）
├── screens/        ← 页面级组件（组合 components + hooks）
├── services/       ← API 调用、外部服务
├── types.ts        ← 模块内部类型
└── index.ts        ← 公开导出
```

### 3.2 模块间依赖

- **同层模块可以互相引用**（features 之间）
- **禁止循环依赖**（A → B → A）
- **跨模块共享逻辑** → 提取到 `packages/core/src/business/` 或 `hooks/`

### 3.3 反射模块特殊规则

reflections 是最复杂的模块（5 个大文件），需要额外约束：
- `insights/` 不得直接修改 `core/` 数据
- `trails/` 的搜索逻辑必须提取到独立 hook
- `RelationMapView` 必须拆分为数据层 + 渲染层

---

## 4. 状态管理规则

### 4.1 Zustand Store 组织

```
packages/core/src/store/
├── types.ts              ← 所有 Slice 接口定义
├── createXxxSlice.ts     ← 单个业务域的 slice
├── storageAdapter.ts     ← 类型 re-export
└── index.ts              ← barrel export

apps/mobile/src/store/
├── useAppStore.ts        ← 组合所有 slices
├── storageAdapter.ts     ← mobile 实现
└── dataStore.ts          ← 实体缓存 store
```

### 4.2 Slice 拆分规则

当一个 slice 满足以下任一条件时，必须拆分：
- 行数 > 500
- 方法数 > 20
- 包含 2 个以上独立的业务域（如 plan + planItem + dailyTodo）

拆分策略：
- 按实体拆分（PlanSlice + PlanItemSlice）
- 按操作类型拆分（CRUD Slice + Sync Slice）
- 共享状态通过 `get()` 访问，不通过闭包传递

### 4.3 持久化规则

- 所有写操作必须通过 `adapter.persistChange()`
- 禁止直接操作 SQLite（除 migration）
- 批量操作使用 `adapter.batchDelete()`
- 写入后立即 flush 仅在迁移场景使用

---

## 5. 复杂度治理规则

### 5.1 新代码约束

| 规则 | 阈值 | 执行方式 |
|------|------|---------|
| 函数最大行数 | 300 | ESLint: max-lines-per-function |
| 认知复杂度上限 | 30 | ESLint: sonarjs/cognitive-complexity |
| 圈复杂度上限 | 20 | ESLint: complexity |
| 嵌套深度上限 | 4 | ESLint: max-depth |
| 组件最大 props | 8 | ESLint: react/destructuring-assignment |

### 5.2 存量代码治理

对于现有超过阈值的代码，采用渐进式治理：
1. **新增功能** → 提取为子组件/hook，不增加原文件复杂度
2. **Bug 修复** → 修复后评估是否拆分
3. **重构** → 必须将复杂度降至阈值以下

### 5.3 禁止的模式

- ❌ 单组件 > 600 行
- ❌ 认知复杂度 > 100 的函数
- ❌ 在组件内直接写 SQL
- ❌ 在 slice 内调用 UI 相关 API（Alert, Navigation）
- ❌ 在 hook 内直接 import 组件

---

## 6. 测试规则

### 6.1 覆盖率要求

| 层级 | 要求 | 当前状态 |
|------|------|---------|
| packages/core/src/business/ | > 80% | 部分覆盖 |
| packages/core/src/store/ | > 70% | ~30% |
| packages/core/src/sync/ | > 80% | 部分覆盖 |
| apps/mobile/src/features/ | > 50% | ~5% |
| apps/mobile/src/components/ | > 40% | ~0% |

### 6.2 测试类型

| 测试类型 | 适用范围 | 工具 |
|----------|---------|------|
| 单元测试 | business/, store/, hooks/ | Vitest |
| 组件测试 | components/, screens/ | Vitest + Testing Library |
| 集成测试 | sync 流程, 数据流 | Vitest |
| E2E 测试 | 核心用户流程 | Detox (未来) |

### 6.3 必须测试的场景

- 所有 Zustand slice 的 CRUD 操作
- 所有 business/ 下的纯函数
- 所有自定义 hooks 的状态变化
- 所有表单提交逻辑
- 所有错误处理路径

---

## 7. 包结构边界

### 7.1 包职责

```
packages/core/          ← 平台无关的业务逻辑、类型、常量
  ├── store/            ← Zustand slices（通过接口注入持久化）
  ├── business/         ← 纯函数业务逻辑
  ├── sync/             ← 同步协议、schema 定义
  ├── ai/               ← AI 服务抽象
  ├── types/            ← 全局类型定义
  ├── constants.ts      ← 主题、颜色、预设值
  └── utils/            ← 通用工具函数

packages/config/        ← 共享配置（ESLint, TypeScript）

apps/mobile/            ← React Native 应用
  ├── src/store/        ← mobile 特定 store（useAppStore, storageAdapter）
  ├── src/features/     ← 功能模块
  ├── src/components/   ← 共享 UI 组件
  ├── src/db/           ← SQLite 数据库层
  ├── src/navigation/   ← 导航配置
  └── src/net/          ← 网络层

apps/web/               ← Next.js Web 应用（如启用）
  ├── src/store/        ← web 特定 store
  ├── src/components/   ← web 组件
  └── src/app/          ← 路由页面
```

### 7.2 禁止的跨包依赖

| 依赖 | 状态 | 原因 |
|------|------|------|
| mobile → core 实现 | ✅ 允许 | 正向依赖 |
| core → mobile 实现 | ❌ 禁止 | 违反 DIP（仅允许接口注入） |
| web → mobile | ❌ 禁止 | 平台隔离 |
| mobile → web | ❌ 禁止 | 平台隔离 |
| core → backend | ❌ 禁止 | 前后端分离 |
| backend → core | ✅ 允许 | pb_hooks 使用核心类型 |

---

## 8. 命名与组织约定

### 8.1 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件 | PascalCase.tsx | `HomeScreen.tsx` |
| Hook | camelCase.ts（use 前缀） | `useQuickTrailSearch.ts` |
| Store Slice | createXxxSlice.ts | `createPlanSlice.ts` |
| 工具函数 | camelCase.ts | `dateStr.ts` |
| 类型定义 | camelCase.ts 或 types.ts | `types.ts` |
| 测试文件 | 与源文件同名.test.ts | `planSlice.test.ts` |
| 常量 | camelCase.ts | `constants.ts` |

### 8.2 导出规则

- 组件使用 `export default`
- Hook 使用命名导出 `export function useXxx()`
- 类型使用命名导出 `export type { Xxx }`
- Slice 使用命名导出 `export function createXxxSlice()`
- 常量使用命名导出 `export const XXX = ...`

---

## 9. 性能规则

### 9.1 渲染优化

- 列表使用 `FlatList`，禁止 `ScrollView` + `.map()`
- 复杂组件使用 `React.memo()`
- 回调使用 `useCallback()`
- 计算密集使用 `useMemo()`
- 动画使用 `useNativeDriver: true`

### 9.2 写入优化

- 所有写入通过 WriteBatcher（100ms 批量窗口）
- 避免在循环中调用 `adapter.persistChange()`
- 批量操作使用 `adapter.batchDelete()`

### 9.3 包大小

- 大型库使用 `React.lazy()` 动态导入
- 图标使用 `lucide-react-native`（tree-shakeable）
- 禁止引入 moment.js（使用 date-fns 或原生 Date）
