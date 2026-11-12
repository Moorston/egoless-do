# OpenSpec 生命周期收尾 + 存量漂移清理

## Goal

闭合 OpenSpec ↔ Trellis 追踪脱节：代码已实现/提交/Trellis 已 archive 的 change，对应的 OpenSpec change 必须走 `openspec archive` 收尾。清理 3 个存量漂移 change，并在 workflow 定义强制收尾步骤，防止本次 explore 新产出的 4 个 proposal 重蹈覆辙。

关联 proposal：`openspec/changes/openspec-lifecycle-close/proposal.md`

## Background

本次 explore 发现 3 个 OpenSpec change 显示 in-progress 但实际代码已合并、Trellis 任务已 archive：

| change | Trellis archive commit | tasks.md |
|--------|----------------------|---------|
| dedupe-home-realtime-save | `63e13c10`(11-03) | 0/19 |
| dedupe-row-to-entity-map | `dcc58e0a`(11-02) | 0/9 |
| consolidate-entity-store-key-mapping | `62b200f0`(11-01) | 0/18 |

另：归档的 `test-coverage-improvement` 进了 archive/ 但 tasks 全 `[ ]`。

根因：`openspec archive` 是正确收尾命令但从未被跑；workflow Phase 3 没把它列为步骤；`openspec status` 报 "4/4 complete"（查文件存在）给假信号。

## Requirements

### R1 — 存量漂移清理（有风险，需验证）
- 对 3 个 in-progress change 逐个：`openspec status` → 对比 spec 内容与 master 当前代码现状 → 确认 spec 未偏离实现 → 勾 tasks.md（`[ ]`→`[x]`）→ `openspec archive <name>`
- `test-coverage-improvement`（已 in archive/）：补勾 tasks.md，无需再 archive
- **安全门**：若某 change 的 spec 与代码现状偏离（实现改了 spec 没跟），先修正 spec 再 archive，不强行 archive 旧 spec

### R2 — 流程加固
- `.trellis/workflow.md` Phase 3 显式加入 `openspec archive` 步骤，明确顺序：代码提交 → Trellis archive → **openspec archive**（勾 tasks + 移入 archive/ + 更新 main specs）→ 完成
- 标注 `openspec status` 的 "All artifacts complete!" 仅表示文件齐全、不代表收尾

### R3 — 漂移检测（可选，可 defer）
- `scripts/check-openspec-drift.sh`（或 .mjs）：对比 `openspec list` in-progress change 与 git/Trellis archive 状态，对"代码已合但 OpenSpec 未 archive"输出告警
- 若时间紧可 defer，仅做 R1+R2

## Acceptance Criteria

- [ ] 3 个存量 in-progress change 全部 `openspec archive` 完成，`openspec list` 不再显示它们为 in-progress
- [ ] `test-coverage-improvement` tasks.md 全 `[x]`
- [ ] 每个 archive 前有 spec↔代码一致性确认记录（可在 implement.md 或 commit message）
- [ ] `.trellis/workflow.md` Phase 3 包含 `openspec archive` 步骤及顺序说明
- [ ] workflow.md 标注 `openspec status` "complete" 的真实含义
- [ ] (可选) `scripts/check-openspec-drift.*` 存在且能对当前仓库跑出 0 漂移（清理后）
- [ ] `openspec list` 仅剩本次 explore 新产出的 4 个 proposal（A/B/C/D）作为 in-progress

## Out of Scope

- 改 `openspec` CLI 本身（status 误报靠文档标注）
- Trellis 侧 task.py 改动（Trellis archive 已正常工作）
- 本次新产出 4 个 proposal 的实现（A/B/C 本身；D 即本任务）
- 历史已 archive 且 tasks 已勾的其他 change

## Risks

- **archive 误移 spec（中）**：`openspec archive` 会把 change 的 spec 写入 main specs。若实现偏离了 spec，archive 会固化旧/错 spec。R1 安全门逐个对比缓解
- **main specs 冲突（低）**：3 个 change 的 spec 若有重叠 capability，archive 时可能冲突。逐个 archive + status 检查可发现
