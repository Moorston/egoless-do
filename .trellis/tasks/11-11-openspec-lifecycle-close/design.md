# Design — OpenSpec 生命周期收尾

> 详细 Why/What/Capabilities 见 `openspec/changes/openspec-lifecycle-close/proposal.md`。本文件聚焦执行的技术决策与安全门。

## 核心机制

`openspec archive <name>` 做三件事：
1. 把 `openspec/changes/<name>/specs/**` 合并进 `openspec/specs/`（main specs，权威源）
2. 把 `openspec/changes/<name>/` 移入 `openspec/changes/archive/<date>-<name>/`
3. 更新 `openspec/` 索引

风险点在第 1 步：若 change 的 spec 内容与 master 当前代码实现偏离（实现时改了行为但没回写 spec），archive 会把过时 spec固化进 main specs，误导后续。

## 安全门设计（R1）

每个 change archive 前的验证协议：

```
for each change in [dedupe-home-realtime-save, dedupe-row-to-entity-map, consolidate-entity-store-key-mapping]:
  1. openspec status --change <name>   → 确认 4/4 artifacts 存在
  2. 读 specs/**/*.md                  → 记录 spec 声明的契约
  3. git log --oneline master..HEAD -- <相关代码路径>  → 确认实现已落地
  4. 对比 spec 契约 vs 实现现状：
       一致 → 勾 tasks.md [x] → openspec archive <name>
       偏离 → 修正 spec 再 archive（或标注偏离原因后决定是否 archive）
  5. archive 后 openspec list 确认该 change 消失（进 archive/）
  6. openspec show <capability> 确认 main specs 含该 spec
```

## tasks.md 勾选策略

3 个 change 的 tasks.md 是实现时的步骤清单，代码已合意味着步骤实际已完成。勾选规则：
- 实际已完成的步骤 → `[x]`
- 实际未做/取消的步骤 → 标注 `- [ ] deferred: <原因>` 或删除
- 不允许留空 `[ ]` 表示"做了但没勾"——要么勾要么标注未做

## workflow.md 改动设计

Phase 3（Finish）现有步骤：3.3 Spec update / 3.4 Commit / 3.5 Wrap-up。

在 3.4 Commit 之后、3.5 Wrap-up 之前插入 **3.4.5 OpenSpec archive**（或并入 3.3 spec update 重命名为 3.3 Spec close）：
- 勾 tasks.md 全 `[x]`
- `openspec archive <name>`
- 验证 `openspec list` 不再显示该 change

并在文档顶部或 Phase 3 注释里标注：`openspec status` "All artifacts complete!" 仅表文件齐全，不代表收尾；收尾以 `openspec archive` 完成且 `openspec list` 无该 change 为准。

## 漂移检测脚本设计（R3，可选）

`scripts/check-openspec-drift.mjs`：
- 输入：`openspec list --json` 的 in-progress changes
- 对每个 change：查 `openspec/changes/archive/` 是否有同名（已 archive 则跳过）→ 查 git log 该 change 相关代码是否已在 master（`git log master --oneline -- <code paths>` 非空）→ 查 `.trellis/tasks/` 是否有对应已 archive 的 Trellis 任务
- 输出：列出"代码已合 + Trellis 已 archive + OpenSpec 未 archive"的 change
- 退出码：有漂移 → 1，无 → 0（可入 CI）

简化：若 R3 defer，仅做 R1+R2，脚本留作后续 change。

## 回滚

- archive 后若发现 spec 错误：`git revert` archive commit（archive 是文件移动+合并，可 revert）
- workflow.md 改动：git revert
