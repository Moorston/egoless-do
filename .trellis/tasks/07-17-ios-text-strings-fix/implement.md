# Implement — iOS Text strings warning 修复

有序执行 checklist，按顺序完成。每步完成后打 ✓。

## Step 1: 修复 root cause（确定性）
- [ ] 1.1 `apps/mobile/src/features/practice/body/BodyDashboard.tsx:812`
  - 改前: `{planProgress.weekComplete}/{planProgress.weekTotal}`
  - 改后: `{String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}`

## Step 2: 修复低概率同源项
- [ ] 2.1 `apps/mobile/src/features/practice/body/screens/CelebrationOverlay.tsx`
  - `:124` `data.totalDurationMin` → `String(data.totalDurationMin)`
  - `:128` `data.totalCalories` → `String(data.totalCalories)`
  - 跑一遍 CelebrationOverlay 相关测试（若有），确认未破坏

## Step 3: 同源排查（grep + 人工过滤）
- [ ] 3.1 跑 grep:
  ```bash
  grep -rEn '<Text[^>]*>\{[^}]*\}</Text>' apps/mobile/src/features/practice apps/mobile/src/features/home apps/mobile/src/features/body > /tmp/bare-text.txt
  ```
- [ ] 3.2 人工过滤出裸数字（排除已 `String(...)` 包裹、模板字符串、`T('...')`）
- [ ] 3.3 修每个命中项（`String(...)` 包裹或模板字符串）

## Step 4: 加 ESLint 规则
- [ ] 4.1 新建 `packages/config/eslint-rules/no-raw-number-in-text.js`
  - Rule id: `no-raw-number-in-text`
  - 用 `@typescript-eslint/utils` + `AST_NODE_TYPES` + TS 类型推断
  - 触发：`<Text>` 子节点裸数字表达式
  - 放行：`String(...)`、模板字符串、`T('...')`
- [ ] 4.2 新建 `packages/config/eslint-rules/index.js` 导出 plugin（如不存在）
- [ ] 4.3 修改 `packages/config/eslint.base.js`
  - `plugins` 加 `'local'`（或插件名）
  - `rules` 加 `'local/no-raw-number-in-text': 'error'`
  - overrides 中 test 文件降为 `warn`
- [ ] 4.4 新建 `packages/config/eslint-rules/__tests__/no-raw-number-in-text.test.js`（RuleTester）
  - valid：`String(x)`、`` `${x}` ``、`T('key')`
  - invalid：`<Text>{length}</Text>`、`<Text>{Math.round(x)}</Text>`

## Step 5: 验证
- [ ] 5.1 `pnpm --filter mobile type-check` → 0 error
- [ ] 5.2 `pnpm run lint` → 0 error, 0 warning（mobile 端命中规则说明 rule 生效）
- [ ] 5.3 `pnpm run test` → 全通过
- [ ] 5.4 再跑一次 Step 3.1 的 grep，确认无漏网

## Step 6: 真机验证
- [ ] 6.1 iOS 真机/模拟器装包运行
- [ ] 6.2 进入 BodyScreen → BodyDashboard，不抛 "Text strings must be rendered..."

## Step 7: Commit（用户确认后）
- [ ] 7.1 commit message:
  ```
  fix(body): wrap bare numbers in <Text> with String() to resolve iOS warning

  - BodyDashboard weekProgress display
  - CelebrationOverlay celebration stats
  - scan practice/home/body for same pattern
  - add ESLint rule local/no-raw-number-in-text to prevent recurrence
  ```

## Rollback Points
- 仅 UI 字符串包裹，每步 commit 粒度小，revert 任一 commit 即可
- ESLint rule 误报：`eslint-disable-next-line local/no-raw-number-in-text` 或回退设计.md§2.4

## Risky Files
- `apps/mobile/src/features/practice/body/BodyDashboard.tsx`
- `apps/mobile/src/features/practice/body/screens/CelebrationOverlay.tsx`
- `packages/config/eslint.base.js`
- `packages/config/eslint-rules/*` (new)
