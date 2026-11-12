# Implement — OpenSpec 生命周期收尾

## 执行顺序

### Step 1 — 验证并 archive `consolidate-entity-store-key-mapping`（最小、最干净先做）
- [ ] `openspec status --change consolidate-entity-store-key-mapping` → 确认 4/4
- [ ] 读 `openspec/changes/consolidate-entity-store-key-mapping/specs/sync-entity-mapping/spec.md`
- [ ] `git log --oneline master..HEAD -- packages/core/src/sync/entitySchemas.ts packages/core/src/sync/entities.ts apps/mobile/src/features/sync/SyncApplyService.ts` → 确认实现已落地（commit `732ba7b6`/`aa301720`/`0b343a9c` 等）
- [ ] 对比 spec 契约 vs 代码：`SCHEMAS` storeKey 字段、ENTITY_STORE_KEY 派生、mobile re-export core
- [ ] 勾 `tasks.md` 全 `[x]`（或标注未做项）
- [ ] **Gate**：spec 与代码一致后才继续
- [ ] `openspec archive consolidate-entity-store-key-mapping`
- [ ] `openspec list` 确认消失；`openspec show sync-entity-mapping` 确认 main specs 含该 spec
- [ ] 验证命令：`openspec validate`（若有）

### Step 2 — 验证并 archive `dedupe-row-to-entity-map`
- [ ] 同 Step 1 流程：status → 读 spec → git log 确认（commit `0b343a9c`）→ 对比 → 勾 tasks → **Gate** → archive → 验证
- [ ] 相关代码：`apps/mobile/src/features/sync/SyncApplyService.ts`（rowMappers 收敛）

### Step 3 — 验证并 archive `dedupe-home-realtime-save`
- [ ] 同 Step 1 流程：status → 读 spec → git log 确认（commit `0efacd63`）→ 对比 → 勾 tasks → **Gate** → archive → 验证
- [ ] 相关代码：`apps/mobile/src/features/home/screens/`（buildCheckinNote 提取、setTimeout(0) 删除）

### Step 4 — 补勾 `test-coverage-improvement` tasks
- [ ] 读 `openspec/changes/archive/2026-07-09-test-coverage-improvement/tasks.md`
- [ ] 对照 git log 确认哪些批次实际完成（WriteBatcher/searchPipeline/useDateNavigation/SyncRehydrationManager 等测试存在性）
- [ ] 勾 `[x]` 实际完成的；未做的标注 `deferred`
- [ ] 此 change 已 in archive/，无需再 `openspec archive`

### Step 5 — workflow.md 流程加固（R2）
- [ ] 读 `.trellis/workflow.md` Phase 3 当前结构
- [ ] 在 3.4 Commit 后插入 OpenSpec archive 步骤（勾 tasks → openspec archive → 验证 openspec list）
- [ ] 标注 `openspec status` "complete" 真实含义
- [ ] 验证：文档无 broken 引用

### Step 6 —（可选 R3）漂移检测脚本
- [ ] 若时间允许：写 `scripts/check-openspec-drift.mjs`（见 design.md）
- [ ] 跑 `node scripts/check-openspec-drift.mjs` 确认清理后 0 漂移
- [ ] 若时间紧：defer，在 prd.md R3 标注 deferred

### Step 7 — 验证 & 提交
- [ ] `openspec list` 仅剩 4 个新 proposal（core-typed-test-harness / sync-resurrection-invariant-tests / coverage-ratchet-gate / openspec-lifecycle-close）作为 in-progress
- [ ] `openspec validate`（若有命令）通过
- [ ] git diff 确认：3 个 change 进 archive/、main specs 更新、workflow.md 改动、tasks.md 勾选
- [ ] 提交：`chore(openspec): archive 3 漂移 change + workflow 收尾步骤`
- [ ] 更新 `.claude/rules/changelog.md`

## Validation Commands

```bash
openspec list --json                    # 确认 in-progress 仅剩 4 个新 proposal
openspec status --change <name>         # archive 前确认 4/4
openspec show <capability>              # archive 后确认 main specs 含 spec
git log --oneline master..HEAD -- <path>  # 确认代码已落地
```

## Rollback Points

- 每个 Step 的 archive 是独立 git 操作 → 可逐个 `git revert`
- Step 5 workflow.md 改动纯文档 → revert 无副作用
- Step 1-3 之间互相独立 → 一个 archive 失败不影响其他

## Review Gates

- **Gate A（每个 archive 前）**：spec 与代码一致性已确认（implement.md Step 1-3 的 Gate）
- **Gate B（Step 7 前）**：`openspec list` 状态符合预期
