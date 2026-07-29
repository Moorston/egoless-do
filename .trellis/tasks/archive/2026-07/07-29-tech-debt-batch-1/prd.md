# Tech Debt Cleanup Batch 1

## Goal

技术债务清理第一批：工具链降级 + 测试修复 + Hook 修复 + ESLint 落地 + 类型修复。关联 openspec change: `tech-debt-cleanup-batch-1`。

## 背景

代码库存在多层技术债务：测试失败、ESLint 规则未落地、Hook 规则违反、production `as any`。更关键的是，7/29 发现**工具链升级导致设计假设漂移**——vitest 4 强制绑定 Vite 8 + rolldown，rolldown 不支持 Flow 语法，导致所有依赖 react-native 的测试在 transform 阶段死亡。

## 需求

本 parent task 拥有整体需求，具体交付拆分到 child tasks：

| Child Task | 范围 | 状态 |
|------------|------|------|
| `07-29-batch-0-toolchain` | 工具链降级（vitest 4→3，Vite 8→6） | planning（当前） |
| Batch 1（待建） | 测试修复（mock 补全 + hardReset） | 待建 |
| Batch 2（待建） | Hook 规则违反修复 | 待建 |
| Batch 3（待建） | ESLint 修复（any/dup/const） | 待建 |
| Batch 4（待建） | ESLint P0 规则落地 | 待建 |
| Batch 5（待建） | 类型修复（visionId） | 待建 |

## 约束

- 保持 Expo SDK 54 生态不变
- 保持 packageManager pnpm 9.0.0 不变
- 每个 Batch 可独立验证
- Batch 0 是后续所有 Batch 的阻塞项

## 验收标准（Parent 级）

- [ ] AP1：所有 child task 完成
- [ ] AP2：`pnpm run test` 全部通过（0 失败）
- [ ] AP3：`pnpm run type-check` 通过
- [ ] AP4：`pnpm run lint` error 归零
- [ ] AP5：openspec change `tech-debt-cleanup-batch-1` 可归档

## 架构治理关联

- `.trellis/spec/governance/ARCHITECTURE-CONSTRAINTS.md` — P0 级 ESLint 规则落地
- `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` — 类型安全、副作用管控

## Notes

- Parent task 拥有 source requirement set、child-task mapping、cross-child acceptance criteria
- 每个 child task 独立规划、实现、验证、归档
- 详细技术设计见 `openspec/changes/tech-debt-cleanup-batch-1/design.md`
- 任务清单见 `openspec/changes/tech-debt-cleanup-batch-1/tasks.md`
