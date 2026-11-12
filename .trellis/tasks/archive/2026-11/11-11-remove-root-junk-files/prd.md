# 删除根目录垃圾文件 lint_final.json 与 meta-all.mjs

## Goal

根目录有两个一次性产物被 git 跟踪：`lint_final.json`（3 MB，7-30 eslint 输出 dump）与 `meta-all.mjs`（24 KB，7-30 metadata 脚本）。它们不被任何代码/脚本引用（grep 验证仅上一任务 prd.md 文字提及），属仓库垃圾。删除并加入 `.gitignore` 防止再次入库。

## Requirements

- R1：`git rm` 删除 `lint_final.json` 与 `meta-all.mjs`。
- R2：`.gitignore` 增加 `lint_final.json` 与 `meta-all.mjs` 条目（若未覆盖）。
- R3：不破坏构建/lint/type-check/test（这些文件不参与任何脚本）。

## Acceptance Criteria

- [ ] AC1：`git ls-files lint_final.json meta-all.mjs` 输出为空（已从跟踪移除）。
- [ ] AC2：`.gitignore` 含这两个文件名。
- [ ] AC3：`pnpm run lint`、`pnpm run type-check` 仍通过（core+mobile）。

## Out of Scope

- 收敛 core lint warnings、清理死代码、修超时测试。
