# Tech Debt Cleanup Batch 1

## Goal

技术债务清理第一批：工具链降级 + 测试修复 + Hook 修复 + ESLint 落地 + 类型修复。关联 openspec change: `tech-debt-cleanup-batch-1`。

## 背景

代码库存在多层技术债务：测试失败、ESLint 规则未落地、Hook 规则违反、production `as any`。更关键的是，7/29 发现**工具链升级导致设计假设漂移**——vitest 4 强制绑定 Vite 8 + rolldown，rolldown 不支持 Flow 语法，导致所有依赖 react-native 的测试在 transform 阶段死亡。

## 需求

本 parent task 拥有整体需求，具体交付拆分到 child tasks：

| Child Task | 范围 | 状态 | 提交 |
|------------|------|------|------|
| `07-29-batch-0-toolchain` | 工具链降级（vitest 4→3，Vite 8→7） | ✅ 完成 | `2d131bd7` |
| Batch 1（未单独建） | 测试修复 | ✅ 完成（Batch 0 附带解决） | `2d131bd7` |
| `07-29-batch-2-hooks` | Hook 规则违反修复 | ⏸️ 暂停 | — |
| `07-29-batch-3-eslint` | ESLint 修复（any/dup/const） | ✅ 部分完成 | `83a1045a` |
| `07-29-batch-4-eslint-rules` | ESLint P0 规则落地 | ✅ 完成（之前已配置） | — |
| `07-29-batch-5-types` | 类型修复（visionId） | ✅ 完成（之前已修复） | — |
| `07-29-p0-sync-field-fix` | P0 sync 协议字段修复 | ✅ 完成（之前已修复） | — |

## 约束

- 保持 Expo SDK 54 生态不变
- 保持 packageManager pnpm 9.0.0 不变
- 每个 Batch 可独立验证
- Batch 0 是后续所有 Batch 的阻塞项

## 验收标准（Parent 级）

> 状态：2026-07-29 部分完成

- [x] AP1：所有 child task 完成 — **部分**（Batch 2 暂停，Batch 3 部分完成）
- [x] AP2：`pnpm run test` 全部通过（0 失败） → ✅ **141 文件 / 1827 测试通过**
- [x] AP3：`pnpm run type-check` 通过 → ✅ 通过
- [ ] AP4：`pnpm run lint` error 归零 → ⚠️ 0 error / 1952 warning（warning 未清除但无 error）
- [ ] AP5：openspec change `tech-debt-cleanup-batch-1` 可归档 → **需 Batch 2/3 完成后归档**

## 遗留工作

| 项目 | 工作量 | 说明 |
|------|--------|------|
| Batch 2（Hook 修复） | 大 | 131 react-hooks warnings，需组件重构 |
| Batch 3（ESLint no-unsafe-*） | 大 | ~1110 no-unsafe-* warnings，需理解业务逻辑加类型 |

## 架构治理关联

- `.trellis/spec/governance/ARCHITECTURE-CONSTRAINTS.md` — P0 级 ESLint 规则落地
- `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` — 类型安全、副作用管控

## Notes

- Parent task 拥有 source requirement set、child-task mapping、cross-child acceptance criteria
- 每个 child task 独立规划、实现、验证、归档
- 详细技术设计见 `openspec/changes/tech-debt-cleanup-batch-1/design.md`
- 任务清单见 `openspec/changes/tech-debt-cleanup-batch-1/tasks.md`
