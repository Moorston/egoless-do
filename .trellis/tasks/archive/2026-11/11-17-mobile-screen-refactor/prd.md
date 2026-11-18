# mobile screen 组件重构 — 8 个无测试 screen max-lines 收敛

Parent: 11-17-mobile-complexity-cleanup

## Goal

治理 8 个无测试 screen 组件的 `max-lines-per-function` warning（324-673 行，阈值 300），把 mobile 剩余 8 warning 降到 0（或按选定策略保留）。**8 个 screen 全部无 co-located 测试**——高风险重构，需先定策略。

## Background

8 个 screen（全部无测试，已核实 mobile 33 测试文件无一覆盖）：
| screen | 行数 |
|--------|------|
| PlanCreateScreen | 673 |
| ProfileScreen | 568 |
| PreceptScreen | 473 |
| BodyPlanEditorScreen | 392 |
| DayCheckinScreen | 368 |
| DiaryModal | 336 |
| RelationMapView | 326 |
| ReviewAIPanel | 324 |

属于 MEMORY.md "Risk-Tiered Complexity Threshold" 高风险场景（zero-test + cold-start + destructive）。强行拆分无测试 screen 有回归风险。

## 策略选择（design.md 决策点，三选一）

### 策略 A — characterization test 先行 + 保守拆分
- 先为每个 screen 写 characterization test（mock 渲染 + 行为快照，参考 MEMORY.md "Characterization Test Baseline"）
- 在测试保护下保守拆分（提取子组件/hook/StyleSheet/handler）
- 最安全，但工作量最大（8 screen × 写测试 + 拆分）
- warning 8→0

### 策略 B — risk-tiered carve-out
- 对无测试 screen 接受现状，per-file `eslint-disable` 带理由（标注"无测试 screen，拆分回归风险高于收益"）
- ratchet 下调排除这些 carve-out（mobile warning 13→8 后，8 个 screen 保留）
- 工作量最小，但 8 个 warning 保留（ratchet 不到 0）
- warning 8→8（保留），ratchet = 8

### 策略 C — 保守拆分（无测试，人工验证）
- 不写测试，只提取明确行为保持的部分（StyleSheet 提取、useCallback handler 提取、纯渲染子组件提取）
- 每个拆分人工验证渲染不变
- 工作量中等，风险中等（无测试网兜底）
- warning 8→0 或近 0

## Acceptance Criteria（按选定策略）

- [ ] 按选定策略处理 8 个 screen
- [ ] mobile 测试全绿，type-check 0 error
- [ ] mobile warning 显著下降（策略 A/C → 0；策略 B → 保留 8 + carve-out 理由）
- [ ] 若策略 A/C：拆分行为保持（人工/测试验证）
- [ ] 若策略 B：每个 eslint-disable 附理由注释

## Out of Scope

- sync 测试 / mkStyles / import/order（child 1）
- ratchet 下调（parent 收尾）
- screen 重写或行为变更

## Risks

- **无测试 screen 拆分回归（高）**：策略 A 用测试网兜底；策略 C 靠人工验证有遗漏风险；策略 B 回避。
- **工作量（中）**：策略 A 最重，策略 B 最轻。
