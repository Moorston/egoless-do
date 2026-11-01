# 复杂度热点拆分 — 技术设计（父任务）

> 本文档定义跨 5 个子任务的统一策略、任务地图和集成验证。
> 各子任务的技术细节（提取边界、props 契约、危险区）由各自的 design.md 承载。

## 1. 统一拆分原则

所有子任务共享以下不可违背的原则：

| # | 原则 | 说明 |
|---|------|------|
| P1 | **Move-only 提取** | 只做"搬移"——子组件/hook 提取，不改变执行逻辑、条件分支、effect 顺序 |
| P2 | **消费方接口契约不变** | 提取前后，父组件的 props 接口、导出签名、调用方式零改动 |
| P3 | **危险区不触碰** | 每个热点有明确的"不碰清单"，见下方危险区矩阵 |
| P4 | **验证三件套** | ESLint complexity 数值 + `pnpm run type-check` + `pnpm run test`（1967 基线）|
| P5 | **独立 commit** | 每个子任务一个 commit，出问题单独回滚，父任务不做 squash |

## 2. 危险区矩阵

| 子任务 | 危险区 | 不碰清单 | 理由 |
|--------|--------|----------|------|
| R1 BodyDashboard | 无 | — | 已有 hook/modal/styles 拆分模式，纯结构提取 |
| R3 PlanDetailContent | 日期检测器 | `createDateChangeDetector` + AppState 监听 + 60s 间隔 | 跨天刷新逻辑，改动易引入状态漂移 |
| R4 HomeScreen | **高** | `setTimeout(() => saveField(), 0)` 保存链、`buildNote` 读 `useAppStore.getState()`、本地状态漂移逻辑 | effect 耦合 + 渲染期读 store，stale closure 高危 |
| R5 SportPage | **高** | effect 链（timer.sec 触发 3 个 effect）、`comboState` ref 渲染期修改、`handleSave` 25 个依赖项 | ref 模式 + effect 顺序，改动易引入组合运动状态机 bug |
| R2 migrateDatabase | **最高** | 迁移执行顺序、tryAddCol 辅助、表重建事务边界 | 零测试覆盖 + 冷启动执行 + 表重建可能永久丢数据 |

## 3. 子任务地图

```
08-26-complexity-hotspot-split (父)
│
├── split-plan-detail-content  (R3, 低风险, CC 58→≤30)
│   提取 TodoTabContent + PlanActionBar
│   useDailyTodo 已存在，复用
│
├── split-body-dashboard       (R1, 低风险, CC 85→≤30)
│   提取 4 个 Banner 子组件 + useBodyDashboardData + useBodyOverrides
│
├── split-home-screen          (R4, 中高风险, CC 49→≤30)
│   提取 WeightCard + WaterCard + ReasonModal/WaterGoalModal
│   不碰 setTimeout 保存链 / buildNote
│
├── split-sport-page           (R5, 中高风险, CC 44→≤30 + handleSave CC 21)
│   提取 useComboSession + saveSingleSport/saveComboExercise
│   复用已有 SportPrepPage/ActivePage/ReportPage + timer/audio/rest hooks
│   不碰 effect 顺序 / comboState ref 模式
│
└── split-migrate-database     (R2, 高风险, CC 67→≤40)
    提取 6 个命名函数，保持执行顺序
    零测试覆盖 → 额外验证：迁移前后 schema 快照对比
```

### 依赖关系

**无依赖**——5 个子任务分属 5 个 feature 目录，文件间无互相导入，可并行。
执行顺序按风险递增仅为节奏控制，非技术依赖。

## 4. 提取模式参考

5 个热点的提取模式高度相似，分两类：

### 模式 A：React 组件提取（R1/R3/R4/R5）

```
源组件（高复杂度）
├── 提取展示子组件  → 接收 props，纯渲染，复杂度分散到各子组件
├── 提取自定义 hook → 聚合 useState/useMemo/useCallback，返回值通过解构消费
└── 主组件变为编排层 → 复杂度降至 ≤15~30
```

**props 契约规则**：子组件只接收它渲染所需的数据和回调，不传整个 store 或父组件引用。

### 模式 B：命名函数提取（R2 migrateDatabase）

```
migrateDatabase（高复杂度）
├── migrateSyncQueueColumns(db)         // 独立命名函数
├── migrateMeditationHistory(db)
├── migrateDailyCustomTodosNullable(db)
├── migrateDailyTodoHistoryNullable(db)
├── migrateFastingSessionsCheck(db)
├── migrateCheckinReviewsUniqueIndex(db)
├── tryAddCol(...) 调用列表            // 留在主函数
└── 线性调用序列                       // 主函数变为编排层
```

**不变式**：提取前后，所有迁移的执行顺序逐字节一致。函数体原封不动搬走，调用处替换为 `await migrateXxx(db)`。

## 5. 集成验证（父任务 gate）

所有子任务 archive 后，父任务执行最终集成验证：

```bash
# 1. ESLint complexity 复测（4 个热点 ≤15；migrateDatabase ≤40 高风险例外）
#    BodyDashboard / PlanDetailContent / HomeScreen / SportPage — complexity ≤15
#    schema.ts migrateDatabase — complexity ≤40（表驱动重构另立任务）
npx eslint apps/mobile/src/features/practice/body/BodyDashboard.tsx \
  apps/mobile/src/db/schema.ts \
  apps/mobile/src/features/plan/PlanDetailContent.tsx \
  apps/mobile/src/features/home/screens/HomeScreen.tsx \
  apps/mobile/src/features/exercise/SportPage.tsx \
  --rule '{"complexity": ["error", 15]}' --no-eslintrc
# 注：schema.ts 会报 migrateDatabase complexity 38，属已接受的 ≤40 例外

# 2. 全量 lint
pnpm run lint

# 3. 类型检查
pnpm run type-check

# 4. 全量测试（≥1967 通过）
pnpm run test
```

### migrateDatabase 额外验证

R2 子任务需要 schema 快照对比：
1. 拆分前：冷启动 → `PRAGMA table_info` 导出所有表定义 → 保存为 baseline
2. 拆分后：冷启动 → `PRAGMA table_info` 导出 → 与 baseline diff
3. 预期：零差异

## 6. 回滚策略

- 每个子任务独立 commit，commit message 格式：`refactor(<feature>): 拆分 <热点名> — CC <旧>→<新>`
- 出问题的子任务单独 `git revert <commit>`，不影响其他子任务
- 父任务保留全部子任务 commit 历史，不做 squash

## 7. 与现有架构约束的对齐

- **包依赖方向**：提取的子组件/hook 留在原 feature 目录内，不跨 feature 引用 ✓
- **Store 读取**：提取的 hook 继续使用 `useShallowStore` 选择器 ✓
- **数据写入**：不涉及 `persistChange` 路径改动 ✓
- **Core 纯净度**：migrateDatabase 在 `apps/mobile/src/db/`，不触碰 `packages/core` ✓
