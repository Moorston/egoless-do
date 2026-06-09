## 1. 修复任务进度计算

- [x] 1.1 修改 `packages/core/src/business/plan.ts` 中的 `computeItemProgress` 函数，使用 Set 按日期去重计算 `doneCount`
- [x] 1.2 同步修改 `packages/core/src/business/plan.ts` 中的 `countDoneCheckins` 函数，保持一致的去重逻辑
- [x] 1.3 运行 `packages/core/src/business/plan.test.ts` 中的现有测试，确保不破坏已有逻辑
- [x] 1.4 为 `computeItemProgress` 添加重复打卡的测试用例

## 2. 修复频率选择器标题

- [x] 2.1 修改 `packages/core/src/i18n/zh.ts` 中的 `freqDaily` 翻译，从"每天"改为"打卡频率"
- [x] 2.2 检查 `packages/core/src/i18n/zh-Hant.ts` 和 `packages/core/src/i18n/en.ts` 是否需要同步修改

## 3. 修复频率 input 框交互

- [x] 3.1 修改 `apps/web/src/components/PlanCreatePage.tsx` 中 interval 模式的 input 框，使用受控组件模式允许空字符串
- [x] 3.2 同步修改 weekly 模式的 input 框
- [x] 3.3 同步修改 monthly 模式的 input 框
- [x] 3.4 添加 onBlur 验证，失焦时自动修正为有效值

## 4. 验证

- [x] 4.1 运行 `pnpm test` 确保所有测试通过
- [ ] 4.2 手动验证任务进度显示正确
- [ ] 4.3 手动验证频率 input 框交互正常
