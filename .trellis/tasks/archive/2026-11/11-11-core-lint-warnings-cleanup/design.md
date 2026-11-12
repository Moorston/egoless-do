# Design — core lint warnings 收敛

## 修复策略

### unused-vars（68）三类处理

1. **未用 import（~30）**：直接从 import 语句删除该符号。多符号 import 行需保留其余符号。代表：`activeOnly`(context-reminder/indexer/risk-warning/checkin/plan 5 处)、`vi`(local-engine.test/model-manager.test/DataGateway.test/createTrailNoteSlice.test/utils.test 5 处)、各 test 文件的类型 import（Plan/PlanItemPriority/PlanItem/PlanItemCheckin/FoodEntry/ExerciseEntry/FastingSession/MedHistoryEntry/GraceHistoryEntry/canEditPlan/startPlan/computePlanProgress/computeRecommendations/generateNarrative/generateNarrativeName/trendLabel/SYNONYM_MAP/dateStr/yesterday）、`LocalAIEngine`(model-manager.ts)、`defaultAuthState`(defaults.ts)、`I18nKey`(i18n/index.ts)、`FearCategory`/`CourageStats`(mindSliceTypes.ts)。

2. **未用参数（~13）**：前缀 `_`（规则 allow `^_`）。代表：coreml/onnx-engine 的 `input/inputs/version`（占位接口实现，参数必须保留以匹配接口签名）、model-manager 的 `modelName/version/path`、markerAggregation `screenWidth`、constants `sportType`、createSettingsSlice `get`、thought-patterns.test `i`。

3. **未用局部变量/常量/函数（~25）**：删除整行（赋值）或整个定义（函数）。代表：`log`(json-utils)、`distance`(layout-algorithms)、`yesterdayCheckin`(risk-warning)、`today`(body)、`CLUSTER_THRESHOLD_PX`(markerAggregation)、`topScore/def`(zhiguanHintEngine)、`totalTargetSecs`(zhiguanTimer)、`TIMED_SPORTS/ZH_NAME_TO_CATEGORY_KEY`(constants)、`applyReadType`(entitySchemas)、`totalDays`(utils)、`short`(retriever.test)、`lng`(coordinateFuzzing.test)、`tomorrow`(utils.test)、`slice`(createCheckinSlice.test×2/createFastingSlice.test×2)、`samplePlan`(createRecycleBinSlice.test)。

   **注意**：删除前确认该符号未被同文件后续代码引用（lint 已确认 unused，但仍 Read 上下文确认不是 lint 误报）。被标记的都是非导出符号，删除不影响 mobile。

### 非测试源码 warning（~21）

- `import/order`×3：`eslint src --ext .ts,.tsx --fix` 一并处理（auto-fix）。
- `no-unsafe-*`×13：定位后加显式类型标注或类型守卫收窄 `unknown`/`any` 来源。
- `max-depth`×5：提取嵌套 if/for 为 early-return 或辅助函数，降至 ≤4 层。

## 变更范围
~35 个 core 文件（源码 + 测试）。不动 mobile、不动配置。

## 验证
```bash
cd packages/core && npx eslint src --ext .ts,.tsx   # warning ≤530, no-unused-vars=0, 0 error
pnpm run type-check && pnpm run lint && pnpm run test
```
