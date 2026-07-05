<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

---

# Egoless-Do Project Constitution — 项目宪法 & 工程规范

> **版本**: v1.0.0 · 2026-07-05
> **维护者**: freebytes
> **审查周期**: 每次重大架构变更时回顾本文件
> **生成依据**: 知识图谱分析 + 最近 10 次提交变更影响评估 (92 files, 1046 symbols)

---

## 一、项目定位与核心原则

### 1.1 产品定位

**egoless-do（无我行）** — 一款修行打卡 / 习惯养成 / 正念冥想的多端应用。用户通过日常打卡（持咒、禅修、运动、素食、止语等）培养自律与觉知，数据支持多设备同步。

### 1.2 核心原则（不可妥协的底线）

| # | 原则 | 说明 |
|---|------|------|
| P1 | **Core 是 Sole Source of Truth** | 业务逻辑、类型、常量、纯函数只放 `packages/core/`。`apps/` 永远不复制 core 的业务代码。 |
| P2 | **Apps 是薄壳** | UI 层、导航层、平台适配层只做 "展示" 和 "调度"。所有业务规则抽到 core。 |
| P3 | **单向依赖** | `app → core` ✅ · `core → app` ❌ · `app-a → app-b` ❌ · `trellis → anything` ✅（工具独立） |
| P4 | **Feature 自治但接口规范** | 各 feature 模块内部可以自成一派，但与外部的通信必须遵守统一的接口约定。 |
| P5 | **测试先行于复杂逻辑** | 任何涉及状态机、数据协议、并发控制的代码，先写测试再实现。 |
| P6 | **渐进重构** | 不追求一次性完美重构。每个 PR 在修改相邻代码时顺手改善，积少成多。 |

---

## 二、目录结构与职责划分

```
egoless-do/
├── apps/                          # 【壳】UI + 导航 + 平台适配
│   ├── mobile/                    # React Native + Expo (主力 App)
│   │   └── src/
│   │       ├── features/          #    功能模块（各自为政，边界清晰）
│   │       ├── components/        #    跨 feature 通用组件
│   │       ├── db/                #    SQLite schema + syncQueue
│   │       ├── store/             #    Zustand store 初始化 (mobile only)
│   │       ├── net/               #    网络层 (offlineAware)
│   │       ├── i18n/              #    国际化初始化
│   │       ├── navigation/        #    路由配置
│   │       └── theme/             #    主题配置 + useTheme hook
│   └── _archive/                 # 归档的遗留代码
    │       └── web-legacy/           # Next.js 15 PWA (archived)
├── packages/                      # 【核】共享逻辑
│   ├── core/                      #    全部业务逻辑 & 类型 & 常量
│   │   ├── ai/                    #    AI 服务 + RAG
│   │   ├── business/              #    纯业务函数
│   │   ├── store/                 #    Zustand slice factories
│   │   ├── sync/                  #    同步协议定义 & 类型
│   │   ├── data/                  #    数据网关接口 (DataGateway)
│   │   ├── i18n/                  #    i18n 键值 & 类型
│   │   ├── types/                 #    共享类型定义
│   │   ├── constants/             #    常量
│   │   └── utils/                 #    工具函数
│   └── config/                    # ESLint + TypeScript 基线
├── backend/                       # 【后端】PocketBase 唯一数据源
│   ├── pb_hooks/                  #    JS hooks (sync/auth/sync_push_pull)
│   ├── pb_migrations/             #    数据库迁移脚本
│   └── pb_schema.json             #    Schema 定义（事实来源）
├── infra/                         # 【运维】部署 & 配置
├── .trellis/                      # 【DevOps】Trellis 工作流 & 规格
├── __tests__/                     # 集成测试 & 回归测试
└── openspec/                      # 架构决策记录
```

### 2.1 新代码该放哪 —— 决策树

```
这个文件做什么？
│
├─ 业务逻辑（计算、校验、规则）？
│   └─ YES → packages/core/src/business/<domain>.ts
│
├─ 状态管理（store slice）？
│   └─ YES → packages/core/src/store/create<Xxx>Slice.ts
│
├─ 数据类型（interface、type、enum）？
│   ├─ 被多个 feature 引用？→ packages/core/src/types/
│   └─ 仅一个 feature 用？→   <feature>/types.ts
│
├─ 常量或配置？
│   └─ YES → packages/core/src/constants/
│
├─ 工具函数（纯函数）？
│   ├─ 通用？→  packages/core/src/utils/
│   └─ domain 特定？→ packages/core/src/business/<domain>/utils.ts
│
├─ UI 组件？
│   ├─ 多个 feature 引用？→ apps/mobile/src/components/<Name>.tsx
│   ├─ 单一 feature 引用？→ apps/mobile/src/features/<name>/components/<Name>.tsx
│   └─ 页面级组件？      → apps/mobile/src/features/<name>/<PageName>.tsx
│
├─ Hook（自定义 React Hook）？
│   ├─ 逻辑密集且有可测试规则？→ packages/core/src/business/... + 导出 pure function
│   └─ UI 相关副作用？         → apps/mobile/src/features/<name>/hooks/use<Xxx>.tsx
│
├─ 数据库表结构变更？
│   ├─ PocketBase 集合？     → backend/pb_migrations/<num>_<desc>.js
│   └─ SQLite 本地表/索引？  → apps/mobile/src/db/schema.ts
│
└─ 无法分类？
    └─ REJECT — 先回答"它真正应该属于哪个抽象层级"
```

### 2.2 Forbidden Imports（红线）

以下导入路径组合 **严禁出现**：

| 违规方向 | 后果 | 修复方案 |
|----------|------|----------|
| `core` → `_archive` | 核心包耦合已归档代码 | 同 core → mobile 处理方式 |
| `mobile` → `web` | App A 直接调用 App B（已不适用——web 已归档）
| `feature-A` → `feature-B` 组件 | Feature 间紧耦合 | 提取共享组件到 `components/` |
| `navigation` → `features/*/screens` 直引 | 路由直接 import 页面 | 保持集中路由表，按需 lazy load |

---

## 三、开发流程规范

### 3.1 功能开发工作流

```
[需求描述]
    ↓
[A] 查看现有架构 (get_architecture / search_graph)
    ↓
[B] 判断影响范围：改了哪些 core file？新增哪些 stores？
    ↓
[C] Core 改造先行：type → constant → business → slice
    ↓
[D] 编写单元测试（core 纯函数必须先有 test）
    ↓
[E] App 层对接：hook → component → page
    ↓
[F] 端到端验证：手动运行 App 走通主路径
    ↓
[G] Code Review Checklist（见 §3.3）
    ↓
[H] Commit: conventional commit format
```

### 3.2 Commit Message 规范

采用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

body (optional)
footer (optional)
```

**Type 枚举**：`feat` · `fix` · `perf` · `refactor` · `style` · `docs` · `test` · `chore` · `revert`

**示例**：
```text
feat(mobile): migrate ReflectionsScreen to FlatList for perf

The ScrollView-based TimelineList caused jank with 200+ entries.
Replace with FlashList and add estimatedItemSize.

BREAKING CHANGE: TimelineList now requires itemHeight prop
```

### 3.3 PR / Code Review Checklist

每个提交应至少检查以下项（标注 ✓）：

#### 结构性（Structural）
- [ ] 新代码放在正确位置（§2.1 决策树）
- [ ] 没有引入 forbidden imports（§2.2）
- [ ] 新增类型统一放到 `core/types/`
- [ ] 新增常量放到 `core/constants/`

#### 质量性（Quality）
- [ ] 单文件大小 ≤ 800 行（允许已有大文件逐次缩减）
- [ ] 单个函数 ≤ 40 行（setter/getter、构造函数除外）
- [ ] 没有 `any` 类型泄漏（新增代码 `no-explicit-any`）
- [ ] i18n 键值使用 `t()` 而非硬编码字符串
- [ ] 新增 hook 遵循 `use*` 命名且只在 React 上下文中调用

#### 兼容性（Compatibility）
- [ ] Store slice 的 state 变更后，消费方同步更新
- [ ] i18n 新增键值对应 `en.ts` + `zh.ts` + `zh-Hant.ts`
- [ ] DB schema 变更有对应的 migration script
- [ ] Sync entitySchema 变更与后端字段对齐

#### 测试性（Testability）
- [ ] Core 纯函数有 `.test.ts`
- [ ] 涉及复杂分支逻辑的函数覆盖率 ≥ 80%

---

## 四、代码质量标准

### 4.1 文件规模限制

| 文件类型 | Soft Limit | Hard Limit | 行动建议 |
|----------|-----------|-----------|---------|
| TSX 页面/屏幕 | 500 行 | 800 行 | >500 行开始拆分组件，>800 必须拆分 |
| TS 引擎类（SyncEngine 等） | 400 行 | 600 行 | 按职责拆分为 mixins 或服务类 |
| TS Core Slice Factory | 200 行 | 350 行 | 提取子逻辑到单独模块 |
| Navigation 路由表 | 300 行 | 450 行 | 按需动态导入，拆分子路由注册器 |
| Business 纯函数文件 | — | 500 行 | 按领域拆分目录 |

**当前超标文件清单**（详见 §六）：
- SyncEngine.ts (1284 行) — **最高优先级**
- SleepEngine.tsx (1001 行)
- BreathingEngine.tsx (940 行)
- HomeScreen.tsx (880 行)
- RelationMapView.tsx (871 行)

### 4.2 函数复杂度限制

| 指标 | 上限 | 检测方式 |
|------|------|----------|
| Cyclomatic Complexity | 10 | ESLint `complexity` rule |
| Cognitive Complexity | 15 | ESLint `max-depth` + 人工审查 |
| 最大行数 | 40 | 人工审查 |
| Nesting Depth | 4 | ESLINT `max-depth: 4` |

### 4.3 TypeScript 规范

```typescript
// ✅ GOOD: 显式返回类型
function calculateScore(points: number[]): Score {
  return points.reduce(sum, 0) / points.length;
}

// ❌ BAD: 隐式推断 + any
function process(data: any[]) {
  // ...
  return something;
}

// ✅ GOOD: discriminated union
type SyncStatus =
  | { status: 'idle' }
  | { status: 'syncing'; progress: number }
  | { status: 'error'; message: string };

// ❌ BAD: parallel optional properties
type SyncStatus = {
  syncing?: boolean;
  progress?: number;
  error?: string;
};
```

**强制规则**（超越 ESLint 基线）：
- 禁止 `any` — 使用 `unknown` + 类型守卫替代
- 禁止 `// @ts-ignore` — 使用 `// @ts-expect-error`（需真实错误）
- 所有 exported 函数必须有返回类型注解
- Interface 优先于 type alias（用于对象形状；type 用于联合/映射）
- Props 使用 `FC` 泛型或手动 Props 接口，禁止省略

### 4.4 React / RN 规范

```typescript
// ✅ GOOD: 职责单一的组件
const CheckinButton = memo(({ onPress }: CheckinButtonProps) => (
  <TouchableOpacity onPress={onPress}>...</TouchableOpacity>
));

// ❌ BAD: God Component 同时管布局 + 状态 + 动画 + 网络
class CheckinModal extends Component {
  // 300 行：fetch, animation, form validation, rendering...
}
```

**规则**：
- 每个 screen 组件最多持有 **一个** 自定义 hook（逻辑抽取 hook）
- 异步操作在 hook 中发起，不在 render 函数中
- 列表渲染必须使用 `FlatList` / `FlashList`，禁止 `.map()` 渲染 >20 项
- Theme 必须通过 `useTheme()` 获取，禁止硬编码颜色/字号/间距

### 4.5 Store 规范

```typescript
// ✅ GOOD: factory 模式，纯 logic
export function createPlanSlice(set: SetState<AllState>, get: GetState<AllState>) {
  return {
    plan: initialState.plan,
    setGoalDate: (date: string) => set({ plan: { ...get().plan, goalDate: date } }),
  };
}

// ❌ BAD: slice 中包含 async 网络请求 + DB 操作
// （这些应通过 DataGateway 在 business layer 封装）
```

**规则**：
- Slice factory 接受 `set` / `get` 参数，不接受外部依赖
- 网络请求放在 `business/` 层，slice 只管理结果 state
- 跨 slice 读取必须通过 `get()`（当前状态），禁止 import 其他 slice
- 新增 field 时必须更新对应的 TypeScript 类型定义

### 4.6 Sync 子系统规范

同步是本项目最复杂的子系统，额外约束如下：

| 规则 | 说明 |
|------|------|
| **前后端协同变更** | entitySchema 的字段变更必须在同一 commit 中连带 PB migration |
| **幂等性保证** | push 和 pull 都必须可重试、可中断、结果幂等 |
| **乐观写入** | 用户操作立即写本地 DB → enqueue → background sync |
| **冲突策略文档化** | 每种 entity 类型必须有明确的 conflict resolution 策略 |
| **实时连接回退** | WebSocket 断连 → polling fallback（已在 SyncEngine 中实现） |

### 4.7 测试要求

```
packages/core/src/business/*.test.ts     ← 业务逻辑必测
packages/core/src/store/*Slice.test.ts   ← 状态转换必测
packages/core/src/sync/*.test.ts         ← 同步协议必测
apps/mobile/src/**/*.test.ts            ← UI 交互可选
```

**最低覆盖率目标**：
- Core business 函数: ≥ 80%
- Core store slices: ≥ 90%
- Core sync 模块: ≥ 95%
- Apps UI: ≥ 30%

**新增测试必须放在**：同目录下的 `<file>.test.ts`，或 `__tests__/` 下对应的子目录。

---

## 五、技术栈与依赖治理

### 5.1 正式技术栈

| 层次 | 技术 | 版本锁定 |
|------|------|----------|
| Runtime | Node.js / Bun | 通过 `engines` 字段 |
| Package Manager | pnpm workspaces | lockfile 提交 |
| Frontend Framework | React 18 + RN 0.7x + Expo | — |
| Backend | PocketBase | pinned in docker-compose |
| State Management | Zustand | — |
| Database (Mobile) | SQLite (expo-sqlite) | — |
| Database (Server) | PocketBase embedded (Badger/BoltDB) | — |
| Sync | WebSocket real-time + HTTP poll fallback | — |
| Testing | Vitest | vitest.config.ts |
| Linting | ESLint (monorepo base) | — |
| Type System | TypeScript | — |

### 5.2 依赖添加规则

1. **能放进 core 绝不放 app** — 如果 web 也需要同样的工具库，放 core
2. **优先使用框架生态推荐** — Expo ecosystem → react-native community
3. **禁止 peer-only 却未安装** — `pnpm install` 必须全绿
4. **每月 review devDependencies** — 移除不再使用的依赖

---

## 六、架构重构清单

> 按优先级排序。每项包含：问题描述 → 风险 → 方案 → 预计工作量

### P0 — 紧急（阻塞后续开发的瓶颈）

#### AR-01: SyncEngine 巨型类拆分 ✅ 已完成
- **现状**: `SyncEngine.ts` 原 1284 行 → 现 398 行，已拆分为 7 个独立服务
- **拆分结果**:
  1. ✅ `SyncPushService` — push 逻辑
  2. ✅ `SyncPullService` — pull 逻辑
  3. ✅ `SyncRealtimeController` — SSE 连接管理
  4. ✅ `SyncRehydrationManager` — rehydrate + initialSync
  5. ✅ `SyncTimestampManager` — 时钟偏移 + lastSyncAt
  6. ✅ `SyncApplyService` — serverPayloadToRow + markSynced
  7. ✅ `SyncResetService` — softReset + hardReset
  8. `SyncEngine` 本身降为协调器（~200 行有效代码）
- **工作量**: 已完成

#### AR-02: 消除 core → mobile 反向依赖 ✅ 已完成
- **现状**: core → mobile 曾被检测到 184 条调用边（知识图谱分析结果）
- **解决**:
  1. ✅ **架构已正确实现**：`StorageAdapter` 接口定义在 `packages/core/src/store/types.ts`（363-368行），32 个 slice factory 全部通过**依赖注入**接收 `adapter: StorageAdapter` 参数，而非直接 import mobile 实现
  2. ✅ **源代码零违规**：对 `packages/core/src/` 的全面 grep 确认，无 `import from apps/mobile`、`react-native`、`expo-`、`AsyncStorage` 等违规
  3. ✅ **184 条调用边的真实性质**：92 条是通过 `StorageAdapter` 接口的正确 DI 调用 + 13 条 `markDeleted` + 3 条 `batchDelete`；其余 74 条为知识图谱将 `Array.push()` 误解析为 `SyncEngine.push()` 产生的误报
  4. ✅ **ESLint 防护已添加**：在 `packages/core/.eslintrc.js` 中配置了 `no-restricted-imports` 规则，阻止未来引入对 `apps/*` 或平台特定包的依赖
- **工作量**: 2 天（2026-07-05 验证完成 + 添加 ESLint 防护）

#### AR-03: 消除 mobile → web 依赖 ✅ 已完成
- **现状**: mobile → web 有 146 条调用边；web 已标记 deprecated
- **解决**: 
  1. ✅ `apps/web/` → `_archive/web-legacy/`（git mv 保留历史）
  2. ✅ 已确认无实际 mobile → web import（知识图谱和 grep 均无结果）
  3. ✅ 更新 pnpm-workspace、CI、Trellis、infra、nginx 配置
  4. ✅ 更新 Trellis spec 和文档中的 web 引用
- **工作量**: 2 天（2026-07-05 完成）

### P1 — 高优先级（显著降低复杂度）

#### AR-04: Navigation 路由表拆分
- **现状**: `navigation/index.tsx` 453 行，集中了所有 26 个 feature 的路由
- **风险**: PR 冲突频繁，可读性差
- **方案**: 拆分为 `createNavigationContainer()` + 各 feature 自注册路由的插件模式
- **工作量**: 2-3 天

#### AR-05: Store Slice 数量规范化
- **现状**: 41 个 slice factory（含 test），大量 thin slices
- **风险**: 维护成本高，跨 slice 耦合隐蔽
- **方案**: 
  1. 合并高度相关的 thin slices（如 body/checkin/weight/diet）
  2. 保留业务域边界（checkin、plan、habit、reflection、sync、auth 等独立）
  3. 目标: 降至 20-25 个 slice
- **工作量**: 3-4 天

#### AR-06: Reflections 模块解构
- **现状**: 7 个子目录（core/hooks/insights/review/shared/timeline/trails），总代码量 3000+ 行
- **风险**: CLAUDE.md 已标记为 "待解体"，复杂度黑洞
- **进度**:
  - ✅ AR-06-1: RelationMapView.tsx 拆分 → core/business/reflectionGraph.ts（340 行，图构建逻辑 core 化）+ insights/hooks/useRelationGraph.ts（交互布局）+ insights/types.ts + 精简主视图（799→451 行，-44%）
  - ✅ useQuickTrailSearch.ts Phase 2+3 helper 提取 + 修复 isAIRecommendAvailable 签名错误
  - AR-06-2: useQuickTrailSearch.ts 剩余拆分 → 搜索/筛选逻辑进一步 core 化
- **方案**:
  1. 识别可复用的子模块（hooks → shared/hooks; insights → analytics/）
  2. 按用户任务分治：创建流（CreateReflectionModal + QuickCreateTrailScreen）独立为子 feature
  3. 浏览/统计（RelationMapView + StatsScreen）归入 insights
  4. 时间线（TimelineList）可考虑作为共享组件
- **工作量**: 5-7 天

#### AR-07: Web 归档 ✅ 已完成 (见 AR-03)
- **现状**: 347 节点，已归档到 `_archive/web-legacy/`
- **解决**: 作为 AR-03 的一部分完成
- **工作量**: 已包含在 AR-03 中

### P2 — 中优先级（技术债偿还）

#### AR-08: 统一 i18n 类型安全机制
- **现状**: `en.ts` / `zh.ts` / `zh-Hant.ts` 手动维护，缺少编译期 key 检查
- **风险**: 组件引用了不存在的 key 或翻译遗漏运行时才发现
- **方案**: 使用 `i18next-resources-to-ts` 或手写 `Keys` 类型从 `en.ts` 自动推导
- **工作量**: 2 天

#### AR-09: Engine 类拆分
- **现状**: SleepEngine(1001)、BreathingEngine(940)、MantraEngine(624)
- **风险**: 类似 SyncEngine 的问题，维护和测试困难
- **方案**: 参照 AR-01 方案，按职责拆分为 Timer + Renderer + Audio Controller 等
- **工作量**: 每例 2-3 天 × 3 = 6-9 天

#### AR-10: Test 目录收敛
- **现状**: test 分散在 `packages/core/src/**/*.test.ts`、`apps/mobile/src/**/*.test.ts`、`__tests__/` 三个位置
- **风险**: CI 配置复杂，覆盖盲区不清
- **方案**: 统一放置在与源码同目录的 `*.test.ts` 文件，`__tests__/` 只保留集成测试
- **工作量**: 1 天（纯搬移）

#### AR-11: Backend Hooks TypeScript 化
- **现状**: `pb_hooks/` 全部是 JS (.pb.js)，无类型提示
- **风险**: PocketBase hooks 天然难测试，JS 加剧维护难度
- **方案**: 维持 JS（受 PocketBase 限制），但添加 JSDoc 类型注释或使用 `.d.ts` 声明文件
- **工作量**: 1-2 天（渐进式）

---

## 七、代码重构清单

> 针对当前变更中发现的具体代码质量问题。可按 PR 逐步处理。

### 7.1 超大文件瘦身（直接降行数）

| 文件 | 当前 | Target | 策略 |
|------|------|--------|------|
| SyncEngine.ts | 1284 | <600 | 拆 4-5 个 service 类 (§AR-01) |
| SleepEngine.tsx | 1001 | <600 | 拆 Timer / Alarm / Notification §AR-09 |
| BreathingEngine.tsx | 940 | <600 | 拆 Timer / Animation / Audio §AR-09 |
| HomeScreen.tsx | 880 | <600 | 拆分 CheckinCard / AgendaPanel / StatsRow 为独立组件 |
| RelationMapView.tsx | 871 | <600 | 图算法抽到 core/business/, UI 层只负责渲染 |
| MindTrailScreen.tsx | 810 | <600 | 拆分 DetailPanel / ActionSheet 组件 |
| ReflectionsScreen.tsx | 866 | <600 | 拆分 Header / Grid / List 视图为独立组件 |

### 7.2 重复模式抽取

| 模式 | 出现位置 | 提取目标 |
|------|----------|----------|
| 音频播放 hook (`useBreathAudio`, `useMantraAudio`, `useSleepNotifications`) | 3 个 feature 各有其变体 | `packages/core/src/audio/usePlayback.ts` |
| 确认弹窗模式 | HabitDetailScreen / PlanCreateScreen / Settings 等多处 | `apps/mobile/src/components/ConfirmDialog.tsx` |
| 日期选择器 modal | DatePickerModal / DateRangePickerModal / TimePickerModal | 现有组件已够，统一 props 接口 |
| Sync status 展示 | SyncBanner / SyncProgressOverlay / SyncConflictPanel | 统一 `SyncIndicator` 组件 |
| 列表空态展示 | Statistics / Habits / Reflections / Settings | `apps/mobile/src/components/EmptyStateView.tsx` |

### 7.3 类型改进

| 问题 | 位置 | 改进方案 |
|------|------|----------|
| `any` 类型残留 | SyncEngine, StorageAdapter, DataGateway 多处 | 使用 `unknown` + discriminated union |
| i18n key 无类型检查 | 所有 `t('key')` 调用 | 自动生成 `type TKeys = keyof typeof en` |
| Entity payload 散落在多处 | Sync pull/push handler | 统一到 `core/sync/entitySchemas.ts` 并做 runtime validation |
| Partial state updates | Store slices 中 deep partial 使用 `any` | 使用 `Partial<T>` + utility types |

### 7.4 性能优化（已在进行中）

根据 git log 最近提交，FlatList 迁移正在进行中：

| 已完成 | 待进行 |
|--------|--------|
| PlanHistoryScreen → FlatList | 长列表页面（StatsScreen, HabitList） |
| PlanDetailContent → FlatList | 时间线超长列表（TimelineList） |
| PreceptScreen → FlatList | 对话框内大列表 |
| MusicPickerModal → FlatList | Card 网格布局的性能优化 |
| 待扫描所有 `.map()` 渲染 >20 项的位置 | 加入 lint rule: `no-array-index-key` |

---

## 八、自动化保障

### 8.1 Pre-commit Hooks（建议配置）

```json
{
  "pre-commit": [
    "lint-staged",           // eslint --fix on staged files
    "tsc --noEmit --pretty", // type check
    "vitest run --related $STAGED_FILES" // related tests
  ]
}
```

### 8.2 CI Pipeline 建议

```yaml
stages:
  1. lint:          pnpm lint                    # ESLint all packages
  2. type-check:    pnpm tsc --noEmit            # Full TS check
  3. unit-test:     pnpm test                    # Vitest
  4. build-mobile:  pnpm --filter mobile build   # Expo prebuild check
  5. build-core:    pnpm --filter @egoless-do/core build  # Bundle check
```

### 8.3 代码审查辅助

利用知识图谱工具在做 CR 时执行：

```bash
# 看改动了什么
detect_changes(since="origin/main")

# 追高风险函数的调用链
trace_path("SyncEngine.push", mode="both", risk_labels=true)

# 检查是否有死代码
search_graph(max_degree=0, exclude_entry_points=true)
```

---

## 九、术语表

| 术语 | 定义 |
|------|------|
| **Checkin** | 用户的每日打卡行为（持咒/禅修/运动/素食等） |
| **Plan** | 用户的修行计划（目标天数、起止日期、类别） |
| **Trail** | 思维轨迹/反思笔记的碎片化记录 |
| **Reflection** | 多条 Trail 聚合成的完整反思 |
| **Sync Push** | 客户端 → 服务端的数据上传 |
| **Sync Pull** | 客户端 ← 服务端的数据拉取 |
| **Entity** | 同步中的最小数据单元（对应 PB collection 的一条 record） |
| **Slice** | Zustand store 的一个片（对应一个 createXxxSlice factory） |
| **Hubu (持布/持咒)** | 念佛号或咒语的修行实践 |
| **Zhiguan (止观)** | 正念冥想练习 |
| **Vow (誓愿)** | 用户的长期承诺（素食/不饮酒/早起等） |

---

## 十、变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0.0 | 2026-07-05 | 初始版本 — 基于知识图谱分析与变更影响评估生成 | Claude + freebytes |

