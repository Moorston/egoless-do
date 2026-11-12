# 收敛 core lint warnings：全部 unused-vars + 非测试源码 warning

## Goal

core 当前 620 lint warnings（0 error，不阻断 CI）。本轮收敛高价值部分：全部 68 个 `no-unused-vars`（真实死代码/未用 import/未用参数）+ 非测试源码 ~21 个 warning（unsafe-assignment/call/member-access、max-depth、import/order）。测试文件的 `no-explicit-any`(246) 与 `no-unsafe-*`(~270) 噪声不在本轮范围。

## Background

620 warnings 分类：no-explicit-any 246（测试）、no-unsafe-member-access 162（测试为主）、no-unsafe-assignment 96（测试为主）、no-unused-vars 68、no-unsafe-call 39（测试为主）、max-depth 5、import/order 4。

非测试源码 warning ~56：unused-vars 35 + unsafe-assignment 7 + max-depth 5 + unsafe-call 4 + import/order 3 + unsafe-member-access 2。本轮覆盖 unused-vars 全量（含测试 68）+ 非测试源码其余 21。

## Requirements

### R1 — 修全部 68 个 no-unused-vars
- 未用 import：删除（如 `activeOnly`×5、`vi`×5、`LocalAIEngine`、`SYNONYM_MAP`、各 test 的类型 import）。
- 未用参数：前缀 `_`（如 `input/inputs/version/modelName/path/screenWidth/sportType/get/i`）。
- 未用局部变量/常量/函数：删除（如 `log/distance/yesterdayCheckin/today/CLUSTER_THRESHOLD_PX/topScore/def/totalTargetSecs/TIMED_SPORTS/ZH_NAME_TO_CATEGORY_KEY/applyReadType/totalDays/short/lng/tomorrow/slice/samplePlan`）。
- 注：被 `no-unused-vars` 标记的都是模块内未导出/未使用的符号（导出符号不会被标记），删除安全、不影响 mobile 消费。

### R2 — 修非测试源码 ~21 个 warning
- `import/order`×3：`eslint --fix`。
- `no-unsafe-assignment`×7、`no-unsafe-call`×4、`no-unsafe-member-access`×2：加类型标注/收窄。
- `max-depth`×5：提取嵌套分支或 early-return 降层。

### R3 — 不回归
- 0 error 维持；测试用例数不减；type-check 通过；mobile 不受影响。

## Acceptance Criteria

- [ ] AC1：`cd packages/core && npx eslint src --ext .ts,.tsx` 的 warning 数从 620 降至 ≤530（即至少消掉 89 个本轮范围内的）。
- [ ] AC2：`no-unused-vars` warning 数为 0。
- [ ] AC3：`pnpm run type-check` exit 0；`pnpm run lint` turbo 2 successful；`pnpm run test` ≥2052 passed。
- [ ] AC4：0 error 维持（不引入新 error）。

## Out of Scope
- 测试文件 `no-explicit-any` / `no-unsafe-*` 噪声（~530，后续另立）。
- 加 `--max-warnings` CI 门禁（后续）。
