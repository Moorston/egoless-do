# Implement — mobile screen 保守拆分（策略 C）

## 执行顺序（按行数降序）

### Step 1 — PlanCreateScreen (673→≤300)
- [ ] 读组件，识别行数构成（StyleSheet / handler / JSX / 计算）
- [ ] StyleSheet 提取到模块级
- [ ] 大 JSX 块抽子组件（props 传数据/callback）
- [ ] 复杂 handler/计算提取纯函数
- [ ] eslint 确认 0 warning
- [ ] type-check 0 error
- [ ] 人工验证 diff 行为保持

### Step 2 — ProfileScreen (568→≤300)
- [ ] 同 Step 1 流程

### Step 3 — PreceptScreen (473→≤300)
- [ ] 同流程

### Step 4 — BodyPlanEditorScreen (392→≤300)
- [ ] 同流程

### Step 5 — DayCheckinScreen (368→≤300)
- [ ] 同流程

### Step 6 — DiaryModal (336→≤300)
- [ ] 同流程（likely StyleSheet 提取即可达标）

### Step 7 — RelationMapView (326→≤300)
- [ ] 同流程（超阈值 26 行，StyleSheet 提取或小 JSX 抽离即可）

### Step 8 — ReviewAIPanel (324→≤300)
- [ ] 同流程（超阈值 24 行，最小改动）

### Step 9 — 全量验证
- [ ] `pnpm run test`（mobile）全绿
- [ ] `pnpm run type-check`（mobile）0 error
- [ ] mobile lint warning 8→0（仅剩 child 1 未处理前的状态；与 child 1 合并后 13→0）

## Validation Commands

```bash
cd D:/MyProject/2026/egoless-do
# 单文件 lint（在 apps/mobile 目录）：
cd apps/mobile && npx eslint src/features/<path>/<file>.tsx --ext .ts,.tsx
# mobile type-check：
pnpm --filter mobile run type-check
# mobile 测试：
./node_modules/.bin/vitest run apps/mobile 2>&1 | tail -10
```

## Rollback Points

- 某个 screen 拆分后 type-check error → revert 该文件，分析 props 接口
- 某个 screen 拆分后行为异常（人工验证发现）→ revert，换更保守的拆法（只做 StyleSheet 提取）
- 单个 screen 卡住（拆不到 ≤300）→ 停该文件，报告，其余继续

## Review Gates

- **每个 screen**：eslint 0 warning + type-check 0 error + 人工 diff 验证
- **Step 9**：全量 mobile 测试绿 + warning 8→0
