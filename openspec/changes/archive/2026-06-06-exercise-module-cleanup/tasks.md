## 1. 共享工具函数提取

- [x] 1.1 新建 `packages/core/src/utils/pace.ts`，将 `formatPace` 函数移入并从 `index.ts` 导出
- [x] 1.2 mobile 端 4 处 `formatPace` 本地定义删除，改为从 `@egoless-do/core` 导入（SportPage、ReportPage、ExerciseHistoryScreen、ExerciseScreen）
- [x] 1.3 web 端 4 处 `formatPace` 本地定义删除，改为从 `@egoless-do/core` 导入（ExerciseTab、SportActivePage、SportReportPage、ExerciseHistoryPage）

## 2. Hook 提取

- [x] 2.1 将 `useAmapComponents` 从 SportPage.tsx 和 ExerciseHistoryScreen.tsx 中提取为 `hooks/useAmapComponents.ts`，两处改为导入
- [x] 2.2 将 SportPage.tsx 中 GPS 辅助函数（getLocation、reqLocPerm、getCurPos、watchPos、computeDistance）提取为 `hooks/useExerciseGps.ts`

## 3. 组件合并与清理

- [x] 3.1 合并 StrengthActive 和 IntervalActive：在 StrengthActive 中新增 `restMode: 'overlay' | 'inline'` prop，根据值选择渲染 RestOverlay 或 EmbeddedRest
- [x] 3.2 删除 `layouts/IntervalActive.tsx`，SportPage 路由改为对 interval 类型传入 `restMode="inline"`
- [x] 3.3 抽取 GPS 运动页：新建 `layouts/GpsActive.tsx`，将 SportPage.tsx 内联的 GPS active JSX 移入
- [x] 3.4 删除未使用的 `shared/SoundPicker.tsx`

## 4. i18n 补全

- [x] 4.1 在 `packages/core/src/i18n/zh.ts` 和 `en.ts` 和 `zh-Hant.ts` 中新增运动模块缺失的 i18n key
- [x] 4.2 RestOverlay.tsx 硬编码中文改为 T() 调用
- [x] 4.3 PrepPage.tsx 硬编码中文改为 T() 调用
- [x] 4.4 EnduranceActive.tsx 硬编码中文改为 T() 调用
- [x] 4.5 PausedPage.tsx 硬编码中文改为 T() 调用
- [x] 4.6 StrengthActive.tsx（含合并后的 Interval 逻辑）硬编码中文改为 T() 调用
- [x] 4.7 EmbeddedRest.tsx 硬编码中文改为 T() 调用
