# 复杂度热点拆分 — 执行计划（父任务）

> 本文档定义子任务编排顺序、前置基线、集成验证 gate 和回滚点。
> 各子任务的具体提取步骤由各自的 implement.md 承载。

## 1. 前置基线记录

在开始任何子任务前，先记录当前基线：

```bash
# 记录 5 个热点当前 complexity 数值
# 预期：85 / 67 / 58 / 49 / 44 (+ handleSave 21)
npx eslint \
  apps/mobile/src/features/practice/body/BodyDashboard.tsx \
  apps/mobile/src/db/schema.ts \
  apps/mobile/src/features/plan/PlanDetailContent.tsx \
  apps/mobile/src/features/home/screens/HomeScreen.tsx \
  apps/mobile/src/features/exercise/SportPage.tsx \
  --rule '{"complexity": ["error", 15]}' --no-eslintrc 2>&1 | grep complexity

# 记录测试基线
pnpm run test 2>&1 | tail -5   # 预期 1967 通过

# 记录 lint 基线
pnpm run lint 2>&1 | tail -5   # 预期 0 error 0 warning
```

## 2. 子任务执行顺序

按风险递增执行（非依赖，节奏控制）：

```
┌─────┬──────────────────────────────┬──────┬──────────────────────────────────┐
│ 顺序│ 子任务                        │ 风险 │ 理由                             │
├─────┼──────────────────────────────┼──────┼──────────────────────────────────┤
│  1  │ split-plan-detail-content    │ 低   │ useDailyTodo 已存在，暖身        │
│  2  │ split-body-dashboard         │ 低   │ 已有拆分模式，结构清晰           │
│  3  │ split-home-screen            │ 中高 │ setTimeout 危险区，边界已定      │
│  4  │ split-sport-page             │ 中高 │ comboState ref + handleSave      │
│  5  │ split-migrate-database       │ 高   │ 零测试 + 表重建 + 冷启动         │
└─────┴──────────────────────────────┴──────┴──────────────────────────────────┘
```

## 3. 单子任务执行流程

每个子任务按以下流程推进：

```
plan → task.py start → implement → check → commit → archive
  │         │           │           │         │         │
  │         │           │           │         │         └─ 归档子任务
  │         │           │           │         └─ commit: refactor(<feature>): 拆分 <热点> — CC <旧>→<新>
  │         │           │           └─ trellis-check: complexity 复测 + type-check + test + 消费方零改动验证
  │         │           └─ trellis-implement: 按 implement.md 有序提取
  │         └─ 激活子任务（review gate 后）
  └─ 写子任务 prd.md / design.md / implement.md / jsonl
```

### 单子任务验收标准（通用）

- [ ] 该热点 ESLint complexity ≤ 15（R2 允许 ≤40，因函数体规模）
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` 全量通过（≥1967）
- [ ] 消费方零改动（diff 检查）
- [ ] 无新增 `any` / `console.log` / raw 用户可见字符串
- [ ] 危险区不触碰清单逐项确认

## 4. 集成验证 gate（父任务）

所有 5 个子任务 archive 后，父任务执行：

```bash
# Gate 1: ESLint complexity 复测（5 个热点均达标）
npx eslint \
  apps/mobile/src/features/practice/body/BodyDashboard.tsx \
  apps/mobile/src/db/schema.ts \
  apps/mobile/src/features/plan/PlanDetailContent.tsx \
  apps/mobile/src/features/home/screens/HomeScreen.tsx \
  apps/mobile/src/features/exercise/SportPage.tsx \
  --rule '{"complexity": ["error", 15]}' --no-eslintrc

# Gate 2: 全量 lint
pnpm run lint   # 预期 0 error 0 warning

# Gate 3: 类型检查
pnpm run type-check   # 预期 0 错误

# Gate 4: 全量测试
pnpm run test   # 预期 ≥1967 通过

# Gate 5: 消费方零改动（5 个消费方文件 diff 为空）
git diff master -- apps/mobile/src/features/practice/body/BodyScreen.tsx
git diff master -- apps/mobile/src/features/plan/   # PlanScreen 等
git diff master -- apps/mobile/src/features/home/navigation/
git diff master -- apps/mobile/src/features/exercise/
# migrateDatabase 消费方：initApp 路径，检查调用签名不变
```

## 5. 回滚点

| 回滚点 | 操作 | 影响范围 |
|--------|------|----------|
| 每个子任务 commit 后 | `git revert <commit>` | 仅该子任务 |
| 父任务集成验证失败 | 逐个 `git revert` 失败的子任务 | 仅失败部分 |
| migrateDatabase schema 快照不一致 | `git revert` R2 commit | 仅 R2 |

## 6. 子任务创建命令

```bash
# 创建 5 个子任务（父任务已存在）
python ./.trellis/scripts/task.py create "拆分 PlanDetailContent — 待办标签+操作栏" --slug split-plan-detail-content --parent 08-26-complexity-hotspot-split
python ./.trellis/scripts/task.py create "拆分 BodyDashboard — Banner+聚合hook" --slug split-body-dashboard --parent 08-26-complexity-hotspot-split
python ./.trellis/scripts/task.py create "拆分 HomeScreen — WeightCard/WaterCard" --slug split-home-screen --parent 08-26-complexity-hotspot-split
python ./.trellis/scripts/task.py create "拆分 SportPage — 组合hook+handleSave" --slug split-sport-page --parent 08-26-complexity-hotspot-split
python ./.trellis/scripts/task.py create "拆分 migrateDatabase — 命名函数提取" --slug split-migrate-database --parent 08-26-complexity-hotspot-split
```

> **注意**：子任务创建需用户确认后执行。每个子任务创建后，需写其 prd.md / design.md / implement.md / jsonl 才能 `task.py start`。
