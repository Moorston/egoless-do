# CI 触发修复：分支 master 化 + 幽灵 artifact 清除 + build-mobile 手动化

> OpenSpec change: `ci-trigger-fix`（proposal 已有，本任务实施）
> 轻量任务（PRD-only）

## 背景

CI 从未在这个仓库跑过：`on.push.branches: [main, develop]` / `on.pull_request.branches: [main]`，但实际主分支是 `master`（remote 无 main 无 develop）。所有"CI 门禁"（lint ratchet、type-check、1243 tests、security audit）只在本地成立。

2026-11-18 explore 发现（详见 `openspec/changes/ci-trigger-fix/proposal.md`）。

## 改动清单（仅 `.github/workflows/ci.yml`）

1. `on.push.branches: [main, develop]` → `[master]`（develop 不存在，不保留）
2. `on.pull_request.branches: [main]` → `[master]`
3. `on` 增加 `workflow_dispatch:`（build-mobile 手动触发入口）
4. 删除 test job 的 "Upload test results" 步骤（48-53 行）——幽灵 artifact：`path: coverage/` 从未生成（test job 跑 `--reporter=verbose` 无 `--coverage`；真跑 coverage 属 `coverage-ratchet-gate` 范围）
5. `build-mobile` 的 `if: github.ref == 'refs/heads/main'` → `if: github.event_name == 'workflow_dispatch'`

## 决策记录

- **build-mobile 触发策略（用户拍板 2026-11-19）**：`workflow_dispatch` 手动触发。理由：EAS preview build 是发布准备动作，不是每次 push 的质量门禁；不引入双平台云构建的持续 EAS quota 消耗。手动 dispatch 时 lint/test/security 三个 job 也会跑（无 if），build-mobile 在其后执行——可接受（手动触发本来就少）。
- **验证路径**：改动合入后，从功能分支开 PR 到 master 即触发 `pull_request` 事件验证 CI 首跑（push.branches 只含 master，功能分支 push 不触发——不需要临时加分支名）。

## 验收标准

- [ ] ci.yml 是有效 YAML（本地 yaml 解析通过）
- [ ] 改动仅限 `.github/workflows/ci.yml` 一个文件
- [ ] lint / test / security 三 job 逻辑未动（只在 push(master) 与 PR(master) 时运行）
- [ ] "Upload test results" 幽灵步骤已删除
- [ ] build-mobile 仅手动 dispatch 触发（`if: github.event_name == 'workflow_dispatch'`）
- [ ] CI 首跑预期（风险管理项）：`pnpm install --frozen-lockfile` 在 CI 环境、turbo 缓存等从未验证过——首跑可能红，那是早暴露早修，跟进修复不属本任务范围

## Out of scope

- CI 结构优化（job 拆分、缓存策略）——proposal 明确只修触发不动结构
- coverage 进 CI（→ `coverage-ratchet-gate`，本 change 是其前置）
- EAS 通路验证（EXPO_TOKEN secret 是否有效——首次手动 dispatch 时自然验证）
