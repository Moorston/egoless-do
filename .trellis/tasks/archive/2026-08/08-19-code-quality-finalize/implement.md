# Implement: Code Quality 收尾

> 详细任务清单见 `openspec/changes/code-quality-batch-2/tasks.md`。本文件是 Trellis 执行视角的有序步骤 + 验证命令。

## 执行顺序

### Step 1: 新增 3 条 ESLint 规则
- [ ] 1.1 编辑 `packages/config/eslint.base.js`，加入 `no-restricted-imports`（禁 react-native AsyncStorage）、`@typescript-eslint/no-floating-promises: error`、`no-console: [warn, { allow: [warn, error] }]`
- [ ] 1.2 `pnpm run lint` 统计 3 条规则各暴露多少新 warning
- [ ] 1.3 决策：≤10 立即修；>10 降级为 `warn` 并记录原因
- [ ] 1.4 修复暴露的违规（或降级）
- **验证**：`pnpm run lint` 不引入新 error

### Step 2: 清 56 条 no-raw-number-in-text
- [ ] 2.1 `pnpm run lint 2>&1 | grep no-raw-number-in-text` 导出 56 处清单
- [ ] 2.2 按 feature 分桶
- [ ] 2.3 逐桶修：`{n}` → `{String(n)}` / 模板字面量
- [ ] 2.4 每桶跑 lint 确认归零
- **验证**：`pnpm run lint | grep -c no-raw-number-in-text` == 0

### Step 3: 清剩余 103 条小尾巴
- [ ] 3.1 `import/order` ×8：`pnpm run lint -- --fix`
- [ ] 3.2 `no-unused-vars` ×29：逐个删或加 `_` 前缀
- [ ] 3.3 `exhaustive-deps` ×38：逐个判断补依赖 / 加 disable 注释
- [ ] 3.4 `max-depth` ×12：提取降嵌套；高风险函数跳过加注释

### Step 4: 回归验证 + 归档
- [ ] 4.1 `pnpm run test` 全通过
- [ ] 4.2 `pnpm run type-check` 通过
- [ ] 4.3 `pnpm run lint` — 0 error，warning ≤ 20
- [ ] 4.4 提交 + 归档本 task
- [ ] 4.5 确认 `tech-debt-cleanup-batch-1` 被取代尾巴标记已生效

## 验证命令汇总

```bash
pnpm run test          # 全测试通过
pnpm run type-check    # 类型检查通过
pnpm run lint          # 0 error, warning ≤ 20
pnpm run lint 2>&1 | grep -c no-raw-number-in-text   # == 0
pnpm run lint 2>&1 | grep -c '@typescript-eslint/no-explicit-any'  # == 0
```

## 回滚点

- 每个 Step 完成后单独 commit，便于回滚
- Step 1 若新规则引发大面积失败，单独 revert `eslint.base.js` 即可恢复
