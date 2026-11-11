# Implement — core lint warnings 收敛

## 执行清单

### Step 1 — 删除未用 import（~30 处）
按文件逐个删除 unused import 符号：
- `ai/context-reminder.ts:3` `activeOnly`
- `ai/rag/indexer.ts:2` `activeOnly`
- `ai/risk-warning.ts:3` `activeOnly`
- `business/checkin.ts:3` `activeOnly`
- `business/plan.ts:9` `activeOnly`
- `ai/local-engine/model-manager.ts:5` `LocalAIEngine`
- `ai/rag/retriever.test.ts:4` `SYNONYM_MAP`
- `business/habits.test.ts:4` `dateStr`, `yesterday`
- `business/plan.test.ts:3` `Plan`, `PlanItemPriority`
- `business/planLogic.test.ts:4` `PlanItem`, `PlanItemCheckin`；`:7` `canEditPlan`；`:8` `startPlan`, `computePlanProgress`
- `business/review.test.ts:4` `FoodEntry`, `ExerciseEntry`, `FastingSession`, `MedHistoryEntry`, `GraceHistoryEntry`
- `business/trail-creation.test.ts:8` `computeRecommendations`；`:13` `generateNarrative`；`:14` `generateNarrativeName`；`:17` `trendLabel`
- `data/DataGateway.test.ts:2` `vi`
- `ai/local-engine/local-engine.test.ts:1` `vi`
- `ai/local-engine/model-manager.test.ts:1` `vi`
- `store/createTrailNoteSlice.test.ts:1` `vi`
- `utils.test.ts:1` `vi`
- `defaults.ts:5` `defaultAuthState`
- `i18n/index.ts:7` `I18nKey`
- `store/mindSliceTypes.ts:4` `FearCategory`；`:5` `CourageStats`

### Step 2 — 未用参数前缀 `_`（~13 处）
- `ai/local-engine/coreml-engine.ts:29` `input`→`_input`；`:33` `inputs`→`_inputs`；`:41` `version`→`_version`
- `ai/local-engine/onnx-engine.ts:29` `input`；`:33` `inputs`；`:41` `version`
- `ai/local-engine/model-manager.ts:94` `modelName`；`:99` `modelName`, `version`；`:109` `path`
- `business/markerAggregation.ts:137` `screenWidth`
- `constants.ts:402` `sportType`
- `store/createSettingsSlice.ts:33` `get`
- `ai/thought-patterns.test.ts:56` `i`

### Step 3 — 删除未用局部变量/常量/函数（~25 处）
- `ai/json-utils.ts:4` `log`
- `ai/layout-algorithms.ts:36` `distance`
- `ai/risk-warning.ts:132` `yesterdayCheckin`
- `business/body.ts:264` `today`
- `business/markerAggregation.ts:9` `CLUSTER_THRESHOLD_PX`
- `business/zhiguanHintEngine.ts:64` `topScore`；`:69` `def`
- `business/zhiguanTimer.ts:19` `totalTargetSecs`
- `constants.ts:297` `TIMED_SPORTS`；`:561` `ZH_NAME_TO_CATEGORY_KEY`
- `sync/entitySchemas.ts:109` `applyReadType`（整个函数）
- `utils.ts:293` `totalDays`
- `ai/rag/retriever.test.ts:47` `short`
- `business/coordinateFuzzing.test.ts:77` `lng`
- `utils.test.ts:4` `tomorrow`
- `store/createCheckinSlice.test.ts:109,123` `slice`
- `store/createFastingSlice.test.ts:236,244` `slice`
- `store/createRecycleBinSlice.test.ts:54` `samplePlan`

每处删除前 Read 上下文确认未在后续行引用。

### Step 4 — 非测试源码 unsafe-* / max-depth / import/order
- 跑 `cd packages/core && npx eslint src --ext .ts,.tsx -f compact | grep "Warning" | grep -v ".test.ts"` 取最新清单。
- `import/order` 用 `--fix`。
- `no-unsafe-*`×13：定位文件行，加类型标注/守卫。
- `max-depth`×5：提取嵌套或 early-return。

### Step 5 — 验证
```bash
cd packages/core && npx eslint src --ext .ts,.tsx   # no-unused-vars=0, warning≤530, 0 error
pnpm run type-check && pnpm run lint && pnpm run test
```

## Review Gates
- Step 5 后 no-unused-vars=0 且 0 error 才算完成。

## Rollback
逐文件 revert；最坏 `git checkout packages/core/src`。
